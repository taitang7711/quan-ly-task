#!/usr/bin/env python3
import paramiko
import sys

SERVER_IP = "192.168.0.110"
SERVER_USER = "taitang96"
SERVER_PASSWORD = "vinhtai1511"
SERVER_PORT = 22
REMOTE_DIR = "/home/taitang96/task-app"

def run_cmd(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    return stdout.read().decode(), stderr.read().decode(), exit_status

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER_IP, port=SERVER_PORT, username=SERVER_USER, password=SERVER_PASSWORD)

print("=== DOCKER PS ===")
out, err, code = run_cmd(ssh, "sudo docker ps -a")
print(out)
if err:
    print("STDERR:", err)

print("\n=== DOCKER-COMPOSE LOGS (backend) ===")
out, err, code = run_cmd(ssh, f"cd {REMOTE_DIR} && sudo docker-compose logs backend --tail=50")
print(out)
if err:
    print("STDERR:", err)

print("\n=== DOCKER-COMPOSE LOGS (frontend) ===")
out, err, code = run_cmd(ssh, f"cd {REMOTE_DIR} && sudo docker-compose logs frontend --tail=50")
print(out)
if err:
    print("STDERR:", err)

print("\n=== CHECK BACKEND PORT ===")
out, err, code = run_cmd(ssh, "sudo netstat -tulpn | grep :5000")
print(out)

ssh.close()
