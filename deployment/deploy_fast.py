#!/usr/bin/env python3
"""
Deployment script for task-manager app with Docker caching and GitHub integration.
Usage:
    python deployment/deploy_fast.py                 # Auto-detect, use cache
    python deployment/deploy_fast.py --force         # Rebuild all without cache
    python deployment/deploy_fast.py --backend       # Rebuild backend only
    python deployment/deploy_fast.py --frontend      # Rebuild frontend only
"""
import os
import sys
import subprocess
import argparse
import paramiko
import time
from scp import SCPClient

# Configuration
SERVER_IP = "192.168.0.110"
SERVER_USER = "taitang96"
SERVER_PASSWORD = "vinhtai1511"
SERVER_PORT = 22
REMOTE_DIR = "/home/taitang96/task-app"
GITHUB_REPO_URL = None  # Will be detected from local git remote
GITHUB_TOKEN = ""

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def print_status(msg, color=GREEN):
    print(f"{color}{msg}{RESET}")

def run_local_command(cmd, capture_output=False):
    """Run a shell command locally."""
    print_status(f"Running: {cmd}", YELLOW)
    result = subprocess.run(cmd, shell=True, capture_output=capture_output, text=True)
    if result.returncode != 0 and capture_output:
        print_status(f"Command failed: {result.stderr}", RED)
    return result

def get_git_remote_url():
    """Get the origin remote URL from local git config."""
    result = run_local_command("git config --get remote.origin.url", capture_output=True)
    if result.returncode == 0:
        url = result.stdout.strip()
        # Convert SSH to HTTPS if needed and embed token
        if url.startswith("git@"):
            url = url.replace("git@github.com:", "https://github.com/")
            url = url.replace(".git", "")
        return url
    return None

def ensure_git_remote():
    """If no remote exists, create a new GitHub repo using token and push."""
    remote_url = get_git_remote_url()
    if remote_url:
        # Inject token into URL for authentication
        if "https://" in remote_url and "@" not in remote_url:
            remote_url = remote_url.replace("https://", f"https://{GITHUB_TOKEN}@")
        return remote_url
    else:
        print_status("No git remote found. Creating new GitHub repository...", YELLOW)
        # Use GitHub API to create repo
        repo_name = "quan-ly-task"
        api_url = "https://api.github.com/user/repos"
        curl_cmd = f'curl -X POST {api_url} -H "Authorization: token {GITHUB_TOKEN}" -H "Accept: application/vnd.github.v3+json" -d \'{{"name":"{repo_name}","private":false}}\''
        result = run_local_command(curl_cmd, capture_output=True)
        if result.returncode != 0:
            print_status("Failed to create GitHub repo. Please create manually.", RED)
            sys.exit(1)
        remote_url = f"https://{GITHUB_TOKEN}@github.com/taitang96/{repo_name}.git"
        run_local_command(f"git remote add origin {remote_url}")
        run_local_command("git branch -M main")
        run_local_command("git push -u origin main")
        return remote_url

def commit_and_push():
    """Commit all changes and push to GitHub."""
    print_status("Checking for uncommitted changes...")
    result = run_local_command("git status --porcelain", capture_output=True)
    if result.stdout.strip():
        print_status("Uncommitted changes found. Committing...")
        run_local_command('git add .')
        run_local_command('git commit -m "Auto-commit before deployment"')
    print_status("Pushing to GitHub...")
    push_result = run_local_command("git push", capture_output=True)
    if push_result.returncode != 0:
        print_status("Push failed. Make sure you have the correct remote and token.", RED)
        sys.exit(1)
    print_status("Push successful.", GREEN)

def run_sudo_cmd(ssh, cmd):
    """Run a command with sudo using echo to provide password."""
    full_cmd = f'echo "{SERVER_PASSWORD}" | sudo -S -p "" {cmd}'
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    exit_status = stdout.channel.recv_exit_status()
    return exit_status, stdout.read().decode(), stderr.read().decode()

def install_dependencies(ssh):
    """Install git, docker, docker-compose on remote server."""
    print_status("Installing dependencies on server...")
    # Update & install git
    run_sudo_cmd(ssh, "apt-get update -y")
    run_sudo_cmd(ssh, "apt-get install -y git")
    # Install docker
    ssh.exec_command("curl -fsSL https://get.docker.com -o get-docker.sh")
    run_sudo_cmd(ssh, "sh get-docker.sh")
    run_sudo_cmd(ssh, "usermod -aG docker $USER")
    # Install docker-compose
    run_sudo_cmd(ssh, "curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose")
    run_sudo_cmd(ssh, "chmod +x /usr/local/bin/docker-compose")
    print_status("Dependencies installed.", GREEN)

def clone_or_pull_repo(ssh):
    """Clone or pull the repository on the server."""
    remote_url_with_token = get_git_remote_url()
    if not remote_url_with_token:
        remote_url_with_token = ensure_git_remote()
    # Replace token for authentication
    if GITHUB_TOKEN not in remote_url_with_token:
        remote_url_with_token = remote_url_with_token.replace("https://", f"https://{GITHUB_TOKEN}@")
    stdin, stdout, stderr = ssh.exec_command(f"test -d {REMOTE_DIR}")
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        print_status("Cloning repository...")
        ssh.exec_command(f"git clone {remote_url_with_token} {REMOTE_DIR}")
    else:
        print_status("Pulling latest changes...")
        ssh.exec_command(f"cd {REMOTE_DIR} && git pull")
    print_status("Repository ready.", GREEN)

def docker_compose_up(ssh, force_rebuild=False, backend_only=False, frontend_only=False):
    """Run docker-compose build and up."""
    base_cmd = f"cd {REMOTE_DIR}"
    build_cmd = "docker-compose build"
    if force_rebuild:
        build_cmd += " --no-cache"
    if backend_only:
        build_cmd += " backend"
    elif frontend_only:
        build_cmd += " frontend"
    # Use sudo for docker commands
    run_sudo_cmd(ssh, f"bash -c 'cd {REMOTE_DIR} && {build_cmd}'")
    run_sudo_cmd(ssh, f"bash -c 'cd {REMOTE_DIR} && docker-compose up -d'")
    print_status("Docker containers started.", GREEN)

def test_deployment(ssh):
    """Simple health checks."""
    print_status("Testing deployment...")
    # Check backend
    exit_code, out, err = run_sudo_cmd(ssh, "curl -s http://localhost:5000/api/tasks/stats/summary")
    if "total_tasks" in out:
        print_status("✅ Backend is healthy", GREEN)
    else:
        print_status("❌ Backend health check failed", RED)
        print_status(f"Backend response: {out[:200]}", YELLOW)
    # Check frontend
    exit_code, out, err = run_sudo_cmd(ssh, "curl -s http://localhost")
    if "Task Manager" in out:
        print_status("✅ Frontend is healthy", GREEN)
    else:
        print_status("❌ Frontend health check failed", RED)
        print_status(f"Frontend response: {out[:200]}", YELLOW)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Rebuild all containers without cache")
    parser.add_argument("--backend", action="store_true", help="Rebuild backend only")
    parser.add_argument("--frontend", action="store_true", help="Rebuild frontend only")
    args = parser.parse_args()

    # 1. Commit and push to GitHub
    commit_and_push()

    # 2. Connect to server via SSH
    print_status(f"Connecting to {SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASSWORD, timeout=10)
    except Exception as e:
        print_status(f"SSH connection failed: {e}", RED)
        sys.exit(1)

    # 3. Install dependencies if needed
    install_dependencies(ssh)

    # 4. Clone/pull repo
    clone_or_pull_repo(ssh)

    # 5. Run docker-compose
    docker_compose_up(ssh, force_rebuild=args.force, backend_only=args.backend, frontend_only=args.frontend)

    # 6. Test
    test_deployment(ssh)

    ssh.close()
    print_status("Deployment completed successfully!", GREEN)

if __name__ == "__main__":
    main()