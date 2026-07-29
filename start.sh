#!/usr/bin/env bash
set -euo pipefail

# Start the Day 04 Research Agent backend and React frontend together.
# Usage:
#   ./start.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/starter_v0"
FRONTEND_DIR="$SCRIPT_DIR/web"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8010}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

BACKEND_PID=""
FRONTEND_PID=""

info() {
  printf '%s\n' "$1"
}

cleanup() {
  info ""
  info "Stopping dev servers..."
  if [ -n "${BACKEND_PID}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    info "Stopped backend PID $BACKEND_PID"
  fi
  if [ -n "${FRONTEND_PID}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    info "Stopped frontend PID $FRONTEND_PID"
  fi
}

trap cleanup EXIT INT TERM

if [ ! -d "$BACKEND_DIR" ]; then
  info "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
  info "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

if [ -x "$BACKEND_DIR/.venv/Scripts/python.exe" ]; then
  PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
elif [ -x "$BACKEND_DIR/.venv/Scripts/python" ]; then
  PYTHON="$BACKEND_DIR/.venv/Scripts/python"
elif [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  PYTHON="$BACKEND_DIR/.venv/bin/python"
elif [ -x "$SCRIPT_DIR/.venv/Scripts/python.exe" ]; then
  PYTHON="$SCRIPT_DIR/.venv/Scripts/python.exe"
elif [ -x "$SCRIPT_DIR/.venv/bin/python" ]; then
  PYTHON="$SCRIPT_DIR/.venv/bin/python"
else
  PYTHON="$(command -v python || true)"
fi

if [ -z "${PYTHON:-}" ]; then
  info "Python was not found. Create a venv or install Python first."
  exit 1
fi

if command -v npm.cmd >/dev/null 2>&1; then
  NPM="npm.cmd"
elif command -v npm >/dev/null 2>&1; then
  NPM="npm"
else
  info "npm was not found. Install Node.js first."
  exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  info "node_modules not found. Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && "$NPM" ci)
fi

info "Python: $PYTHON"
info "npm: $NPM"
info ""
info "Starting backend:  http://$BACKEND_HOST:$BACKEND_PORT"
(
  cd "$BACKEND_DIR"
  "$PYTHON" -m uvicorn api:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload
) &
BACKEND_PID=$!

info "Starting frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  VITE_API_BASE_URL="http://$BACKEND_HOST:$BACKEND_PORT" \
    "$NPM" run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort
) &
FRONTEND_PID=$!

info ""
info "Backend PID:  $BACKEND_PID"
info "Frontend PID: $FRONTEND_PID"
info "Open: http://$FRONTEND_HOST:$FRONTEND_PORT"
info "Press Ctrl+C to stop both servers."

wait "$BACKEND_PID" "$FRONTEND_PID"
