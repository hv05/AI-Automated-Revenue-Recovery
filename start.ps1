Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting RecoverFlow AI (FastAPI + Next.js 14)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if Backend is already running
$backendPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $backendPort) {
    Write-Host "`n[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; .\venv\Scripts\python.exe run.py"
} else {
    Write-Host "`n[1/2] FastAPI Backend already running on http://localhost:8000" -ForegroundColor Green
}

# Check if Frontend is already running
$frontendPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if (-not $frontendPort) {
    Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; npm run dev"
} else {
    Write-Host "[2/2] Next.js Frontend already running on http://localhost:3000" -ForegroundColor Green
}

Write-Host "`nRecoverFlow AI is ready!" -ForegroundColor Green
Write-Host "  - Merchant Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "  - Recovery Monitor:   http://localhost:3000/simulator" -ForegroundColor White
Write-Host "  - Backend API Docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Cyan

