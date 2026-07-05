# TechNova AI Platform — Startup Script

Write-Host "🚀 Starting TechNova AI Platform..." -ForegroundColor Cyan

# 1. Start Docker Containers if Docker Daemon is running
Write-Host "🐳 Checking Docker containers..." -ForegroundColor Gray
docker-compose up -d postgres redis

# 2. Start FastAPI Backend in a new window
Write-Host "☕ Launching FastAPI Python Backend..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py"

# 3. Start React Frontend in a new window
Write-Host "⚡ Launching React Vite Frontend..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "🎉 Platform startup commands issued." -ForegroundColor Green
Write-Host "  - Backend API: http://localhost:8000" -ForegroundColor Gray
Write-Host "  - Frontend App: http://localhost:5173" -ForegroundColor Gray
Write-Host "  - pgAdmin: http://localhost:5050 (Credentials: admin@technova.com / admin123)" -ForegroundColor Gray
