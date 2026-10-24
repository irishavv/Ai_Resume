@echo off
setlocal
title AI Portfolio - AI Service
cd /d "%~dp0ai-service"

where python >nul 2>nul
if errorlevel 1 (
    echo Error: Python was not found on PATH. Install Python 3.11+ and try again.
    exit /b 1
)

rem First run on a clean checkout: build the virtual environment and install deps.
if not exist ".venv\Scripts\python.exe" (
    echo [setup] Creating the Python virtual environment [.venv]...
    python -m venv .venv
    if errorlevel 1 (
        echo Error: could not create the virtual environment.
        exit /b 1
    )
    echo [setup] Installing dependencies from requirements.txt...
    ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt
    if errorlevel 1 (
        echo Error: dependency installation failed.
        exit /b 1
    )
)

rem Port comes from the single repo-root .env (AI_SERVICE_PORT), default 8000.
set "AI_SERVICE_PORT=8000"
for /f "usebackq tokens=1,* delims==" %%A in ("..\.env") do (
    if /i "%%A"=="AI_SERVICE_PORT" set "AI_SERVICE_PORT=%%B"
)

echo [run] AI service listening on http://localhost:%AI_SERVICE_PORT%  (docs at /docs)
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port %AI_SERVICE_PORT%
