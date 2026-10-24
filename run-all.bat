@echo off
echo Starting AI Portfolio - Full Stack...

start "AI Service" cmd /c "run-ai.bat"
start "Backend" cmd /c "run-backend.bat"
start "Frontend" cmd /c "cd frontend && npm run dev"

echo All services are starting in separate windows.
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8080
echo AI Service: http://localhost:8000
