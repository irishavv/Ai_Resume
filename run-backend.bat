@echo off
setlocal
title AI Portfolio - Backend
cd /d "%~dp0backend"

rem Maven is not always installed globally, so the project ships its own wrapper.
if not exist "mvnw.cmd" (
    echo Error: mvnw.cmd was not found in the backend folder.
    exit /b 1
)

rem Port and datasource come from the repo-root .env (BACKEND_PORT, default 8080).
echo [run] Starting the backend on http://localhost:8080
call mvnw.cmd -B spring-boot:run
