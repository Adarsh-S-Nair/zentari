@echo off
echo Starting Trading API Development Environment...
echo.

echo Starting Frontend...
cd frontend
start "Frontend Dev Server" cmd /k "npm run dev"
cd ..

echo.
echo Starting Backend...
cd backend

echo Creating virtual environment if it doesn't exist...
if not exist "venv" (
    echo Creating new virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing requirements...
pip install -r requirements.txt

echo Starting backend server...
uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause 