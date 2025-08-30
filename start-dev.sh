#!/usr/bin/env bash
set -euo pipefail

# Always operate from the repo root
cd "$(dirname "$0")"

echo "Starting Zentari Development Environment..."
echo

# -------------------------------
# Frontend
# -------------------------------
echo "Preparing frontend environment variables..."
cp -f frontend/.env.dev-local frontend/.env

echo "Starting Frontend in a new terminal..."

launch_frontend_new_terminal() {
  local frontend_dir
  frontend_dir=$(cd frontend && pwd)

  # Windows (VSCode using Git Bash/MinGW)
  if [ "${OS:-}" = "Windows_NT" ] || uname -s 2>/dev/null | grep -qiE 'mingw|msys'; then
    # Open a new PowerShell window, keep it open, and run Vite in frontend dir
    local frontend_dir_win
    if command -v cygpath >/dev/null 2>&1; then
      frontend_dir_win=$(cygpath -w "$frontend_dir")
    else
      frontend_dir_win="$frontend_dir"
    fi
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'powershell' -WorkingDirectory '$frontend_dir_win' -ArgumentList @('-NoExit','-Command','npm run dev') -WindowStyle Normal -Verb Open"
    return 0
  fi

  # macOS
  if command -v osascript >/dev/null 2>&1 && sw_vers >/dev/null 2>&1; then
    osascript -e 'tell application "Terminal" to do script "cd '"$frontend_dir"' && npm run dev"' || true
    osascript -e 'tell application "Terminal" to activate' || true
    return 0
  fi

  # Linux common terminals
  local cmd="cd '$frontend_dir' && npm run dev; exec bash"
  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -lc "$cmd" && return 0
  fi
  if command -v konsole >/dev/null 2>&1; then
    konsole -e bash -lc "$cmd" && return 0
  fi
  if command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -e bash -lc "$cmd" && return 0
  fi
  if command -v xfce4-terminal >/dev/null 2>&1; then
    xfce4-terminal -e "bash -lc '$cmd'" && return 0
  fi
  if command -v xterm >/dev/null 2>&1; then
    xterm -hold -e bash -lc "$cmd" && return 0
  fi

  # Fallback: run in background in this terminal if we cannot open a new one
  echo "Warning: could not open a new terminal for the frontend. Running in background in this shell instead." >&2
  (
    cd "$frontend_dir"
    npm run dev
  ) &
}

launch_frontend_new_terminal

# -------------------------------
# Backend
# -------------------------------
echo
echo "Starting Backend..."
cd backend

echo "Preparing backend environment variables..."
cp -f .env.dev-local .env

echo "Freeing port 8000 if in use..."
kill_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    # Unix-like systems with lsof
    local pids
    pids=$(lsof -ti tcp:"$port" || true)
    if [ -n "${pids:-}" ]; then
      echo "Killing PIDs on port $port: $pids"
      kill -9 $pids 2>/dev/null || true
    else
      echo "Port $port is free."
    fi
  elif command -v fuser >/dev/null 2>&1; then
    # Alternative on some Linux distros
    fuser -k "${port}/tcp" 2>/dev/null || echo "Port $port is free."
  elif [ "${OS:-}" = "Windows_NT" ]; then
    # Windows via Git Bash: use netstat + taskkill
    local pids
    pids=$(netstat -ano 2>/dev/null | tr -d '\r' | awk -v p=":$port" '$0 ~ p {print $NF}' | sort -u)
    if [ -n "${pids:-}" ]; then
      echo "Killing PIDs on port $port: $pids"
      for pid in $pids; do
        taskkill //F //PID "$pid" 1>/dev/null 2>&1 || true
      done
    else
      echo "Port $port is free."
    fi
  else
    echo "Warning: could not determine how to free port $port on this system." >&2
  fi
}

kill_port 8000

echo "Checking virtual environment..."
created_venv=false
if [ ! -d "venv" ]; then
  echo "Creating new virtual environment..."
  if command -v python >/dev/null 2>&1; then
    PYTHON_CMD=python
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD=python3
  else
    echo "Error: Python is not installed or not on PATH." >&2
    exit 1
  fi
  "$PYTHON_CMD" -m venv venv
  created_venv=true
fi

echo "Activating virtual environment..."
if [ -f "venv/Scripts/activate" ]; then
  # Windows Git Bash
  # shellcheck disable=SC1091
  source venv/Scripts/activate
else
  # Unix-like
  # shellcheck disable=SC1091
  source venv/bin/activate
fi

if [ "$created_venv" = true ]; then
  echo "Installing requirements..."
  pip install -r requirements.txt
else
  echo "Virtual environment already exists. Skipping requirements installation."
fi

echo "Starting backend server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000


