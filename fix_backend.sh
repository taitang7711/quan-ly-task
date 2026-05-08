#!/bin/bash
# Fix script to run on server after deployment
echo "Fixing backend issues..."
cd /home/taitang96/task-app

# Ensure .env has JWT_SECRET
if ! grep -q "JWT_SECRET" backend/.env; then
    echo "JWT_SECRET=$(openssl rand -base64 32)" >> backend/.env
    echo "Added JWT_SECRET to .env"
fi

# Restart backend container
docker-compose down backend
docker-compose up -d backend

# Wait for backend to start
sleep 5

# Run migration
docker exec task-backend node migrate.js

# Check logs
docker logs task-backend --tail 20

echo "Done"
