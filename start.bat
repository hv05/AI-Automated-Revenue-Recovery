@echo off
title RecoverFlow AI Launcher
echo ========================================================
echo   Starting RecoverFlow AI (FastAPI + Next.js 14)
echo ========================================================
echo.
echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "RecoverFlow AI - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe run.py"

echo [2/2] Launching Next.js Frontend on http://localhost:3000 ...
start "RecoverFlow AI - Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Servers started in separate terminal windows!
echo - Dashboard: http://localhost:3000
echo - Simulator: http://localhost:3000/simulator
echo - API Docs:  http://localhost:8000/docs
echo ========================================================
pause
