Write-Host "Starting Trading API Development Environment..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Frontend..." -ForegroundColor Yellow
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Set-Location ..

Write-Host ""
Write-Host "Starting Backend..." -ForegroundColor Yellow
Set-Location backend

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