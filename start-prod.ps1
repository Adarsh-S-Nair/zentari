Write-Host "Starting Zentari Development Environment..." -ForegroundColor Green
Write-Host ""

# Frontend
Write-Host "Preparing frontend environment variables..." -ForegroundColor Cyan
Copy-Item -Path "frontend\.env.prod-local" -Destination "frontend\.env" -Force

Write-Host "Starting Frontend..." -ForegroundColor Yellow
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Set-Location ..

# Backend
Write-Host ""
Write-Host "Starting Backend..." -ForegroundColor Yellow
Set-Location backend

Write-Host "Preparing backend environment variables..." -ForegroundColor Cyan
Copy-Item -Path ".env.prod-local" -Destination ".env" -Force

Write-Host "Freeing port 8000 if in use..." -ForegroundColor Cyan
try {
    $procId = (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess
    if ($procId) {
        Get-Process -Id $procId | Stop-Process -Force
        Write-Host "Killed process using port 8000 (PID $procId)" -ForegroundColor Red
    } else {
        Write-Host "Port 8000 is free." -ForegroundColor Green
    }
} catch {
    Write-Host "Could not release port 8000: $_" -ForegroundColor Red
}

Write-Host "Checking virtual environment..." -ForegroundColor Cyan
if (-not (Test-Path "venv")) {
    Write-Host "Creating new virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
    Write-Host "Installing requirements..." -ForegroundColor Yellow
    pip install -r requirements.txt
} else {
    Write-Host "Virtual environment already exists." -ForegroundColor Green
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
    Write-Host "Skipping requirements installation (already installed)." -ForegroundColor Green
}

Write-Host "Starting backend server..." -ForegroundColor Yellow
uvicorn main:app --reload --host 0.0.0.0 --port 8000
