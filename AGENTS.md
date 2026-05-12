## Project Guide

### Domain
- **Test/Production**: https://task.cybernest.io.vn (đã có sẵn tài khoản admin/admin123)

### Deploy
- Script: `python deployment/deploy_fast_test.py`
- Options:
  - `--force`: rebuild toàn bộ không cache
  - `--backend`: chỉ rebuild backend
  - `--frontend`: chỉ rebuild frontend
- Script tự động commit + push + SSH + docker-compose

### Server
- IP: 18.139.219.244
- SSH user: taitang96 / pass: vinhtai1511
- App dir: /home/taitang96/task-app
- Docker: task-mysql, task-backend, task-frontend

### Quy trình deploy
1. Code xong → commit + push lên GitHub
2. Chạy deploy script
3. Kiểm tra tại https://task.cybernest.io.vn

### Git
- Remote: https://github.com/taitang96/quan-ly-task.git
