import paramiko
import time
import sys

SERVER_IP = '192.168.0.110'
SERVER_USER = 'taitang96'
SERVER_PASSWORD = 'vinhtai1511'
REMOTE_DIR = '/home/taitang96/task-app'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER_IP, port=22, username=SERVER_USER, password=SERVER_PASSWORD, timeout=10)

def run(cmd):
    full_cmd = 'echo "' + SERVER_PASSWORD + '" | sudo -S -k bash -c "' + cmd.replace('"', '\\"') + '"'
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    status = 'OK' if exit_status == 0 else 'FAIL(%d)' % exit_status
    print('[%s] %s' % (status, cmd[:80]))
    if err:
        for line in err.split('\n')[:5]:
            print('  > %s' % line)
    return out

print('=== CLEANUP ===')
run('docker rm -f task-mysql task-backend task-frontend 2>/dev/null')
run('docker network rm task-app_task-network 2>/dev/null')
run('docker volume rm task-app_mysql_data 2>/dev/null')

print('=== PULL LATEST ===')
run('cd %s && git pull' % REMOTE_DIR)

print('=== DEPLOY ===')
run('cd %s && docker-compose up -d' % REMOTE_DIR)

print('=== HEALTH CHECK ===')
time.sleep(25)
out = run('curl -s http://localhost:5000/api/health')
if 'ok' in out.lower():
    print('BACKEND HEALTHY!')
else:
    print('Backend failed: %s' % out[:200])
    run('docker logs task-mysql --tail 20')
    run('docker logs task-backend --tail 20')

ssh.close()
print('Done!')
