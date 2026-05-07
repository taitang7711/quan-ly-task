#!/usr/bin/env python3
"""
Automated deployment using a Git repository on the server itself.
No GitHub, no SCP – pure Git over SSH.
"""
import os
import sys
import subprocess
import paramiko

# Configuration
SERVER_IP = "192.168.0.110"
SERVER_USER = "taitang96"
SERVER_PASSWORD = "vinhtai1511"
SERVER_PORT = 22
BARE_REPO_PATH = "/home/taitang96/task-repo.git"
DEPLOY_PATH = "/home/taitang96/task-app"
LOCAL_KEY_DIR = "deployment/ssh_keys"
PRIVATE_KEY_PATH = os.path.join(LOCAL_KEY_DIR, "id_rsa")
PUBLIC_KEY_PATH = os.path.join(LOCAL_KEY_DIR, "id_rsa.pub")

def run_local(cmd):
    print(f"[LOCAL] {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr)
        sys.exit(1)
    return result.stdout.strip()

def generate_ssh_key():
    if os.path.exists(PRIVATE_KEY_PATH):
        print("✓ SSH key pair already exists.")
        return
    os.makedirs(LOCAL_KEY_DIR, exist_ok=True)
    run_local(f'ssh-keygen -t rsa -b 4096 -f "{PRIVATE_KEY_PATH}" -N ""')
    print("✓ SSH key pair generated.")

def add_public_key_to_server():
    print("Adding public key to server...")
    with open(PUBLIC_KEY_PATH, "r") as f:
        pub_key = f.read().strip()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASSWORD)
        stdin, stdout, stderr = ssh.exec_command(f'mkdir -p ~/.ssh && echo "{pub_key}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys')
        stdout.channel.recv_exit_status()
        print("✓ Public key added to server.")
    except Exception as e:
        print(f"Failed to add public key: {e}")
        sys.exit(1)
    finally:
        ssh.close()

def create_bare_repo_on_server():
    print("Creating bare Git repository on server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASSWORD)
        ssh.exec_command(f'git init --bare {BARE_REPO_PATH}')
        print("✓ Bare repository created.")
    except Exception as e:
        print(f"Failed to create bare repo: {e}")
        sys.exit(1)
    finally:
        ssh.close()

def add_remote_and_push():
    print("Adding remote 'server' and pushing code...")
    # Remove remote if exists
    run_local('git remote remove server 2>/dev/null || true')
    run_local(f'git remote add server ssh://{SERVER_USER}@{SERVER_IP}:{SERVER_PORT}{BARE_REPO_PATH}')
    # Push master branch (or current branch)
    current_branch = run_local('git rev-parse --abbrev-ref HEAD')
    run_local(f'git push -u server {current_branch}')
    print("✓ Code pushed to server.")

def clone_and_deploy_on_server():
    print("Cloning repository on server and deploying with Docker...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASSWORD)
        # Remove previous deploy folder if exists
        ssh.exec_command(f'rm -rf {DEPLOY_PATH}')
        # Clone from the bare repo
        ssh.exec_command(f'git clone {BARE_REPO_PATH} {DEPLOY_PATH}')
        # Run docker-compose
        commands = f"""
cd {DEPLOY_PATH}
docker-compose build --no-cache  # first time, subsequent runs will use cache
docker-compose up -d
"""
        stdin, stdout, stderr = ssh.exec_command(commands)
        stdout.channel.recv_exit_status()
        print("✓ Docker containers started.")
        # Health check
        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost")
        frontend_status = stdout.read().decode()
        if "Task Manager" in frontend_status:
            print("✅ Frontend is healthy")
        else:
            print("⚠️ Frontend health check failed")
        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5000/api/tasks/stats/summary")
        backend_check = stdout.read().decode()
        if "total_tasks" in backend_check:
            print("✅ Backend is healthy")
        else:
            print("⚠️ Backend health check failed")
    except Exception as e:
        print(f"Deployment failed: {e}")
        sys.exit(1)
    finally:
        ssh.close()

def main():
    print("🚀 Starting automated Git-on-server deployment...")
    generate_ssh_key()
    add_public_key_to_server()
    create_bare_repo_on_server()
    add_remote_and_push()
    clone_and_deploy_on_server()
    print("🎉 Deployment completed successfully!")
    print(f"🌐 Application is available at http://{SERVER_IP}")

if __name__ == "__main__":
    main()