Write-Host "Starting Trading API Development Environment..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Frontend..." -ForegroundColor Yellow
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Set-Location ..

Write-Host ""
Write-Host "Starting Backend..." -ForegroundColor Yellow
Set-Location backend

Write-Host "Creating virtual environment if it doesn't exist..." -ForegroundColor Cyan
if (-not (Test-Path "venv")) {
    Write-Host "Creating new virtual environment..." -ForegroundColor Cyan
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

Write-Host "Installing requirements..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "Starting backend server..." -ForegroundColor Green
uvicorn main:app --reload --host 0.0.0.0 --port 8000 