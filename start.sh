#!/usr/bin/env bash
set -eu
set -o pipefail 2>/dev/null || true

# Start the Day 04 Research Agent backend and React frontend together.
# Usage:
#   ./start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/starter_v0"
FRONTEND_DIR="$SCRIPT_DIR/web"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-}"
PREFERRED_BACKEND_PORT="${PREFERRED_BACKEND_PORT:-8010}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-}"
PREFERRED_FRONTEND_PORT="${PREFERRED_FRONTEND_PORT:-5173}"

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

choose_port() {
  "$PYTHON" - "$1" "$2" <<'PY'
import socket
import sys

host = sys.argv[1]
preferred = int(sys.argv[2])
candidates = [
    preferred,
    preferred + 1,
    preferred + 2,
    preferred + 10,
    preferred + 100,
    18010,
    28010,
    38010,
]
seen = set()
for port in candidates:
    if port in seen:
        continue
    seen.add(port)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError:
            continue
    print(port)
    raise SystemExit(0)

raise SystemExit(f"No bindable port found for {host}")
PY
}

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

if [ -z "$BACKEND_PORT" ]; then
  BACKEND_PORT="$(choose_port "$BACKEND_HOST" "$PREFERRED_BACKEND_PORT")"
fi

if [ -z "$FRONTEND_PORT" ]; then
  FRONTEND_PORT="$(choose_port "$FRONTEND_HOST" "$PREFERRED_FRONTEND_PORT")"
fi

info "Python: $PYTHON"
info "npm: $NPM"
info ""
info "Starting backend:  http://$BACKEND_HOST:$BACKEND_PORT"
(
  cd "$BACKEND_DIR"
  if [ "${BACKEND_RELOAD:-0}" = "1" ]; then
    "$PYTHON" -m uvicorn api:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload
  else
    "$PYTHON" -m uvicorn api:app --host "$BACKEND_HOST" --port "$BACKEND_PORT"
  fi
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
