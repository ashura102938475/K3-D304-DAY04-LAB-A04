#!/usr/bin/env bash
# =============================================================================
# start.sh — Khởi động Backend (FastAPI) + Frontend (Vite) cùng lúc
# =============================================================================
# Cách dùng:
#   chmod +x start.sh   (lần đầu tiên)
#   ./start.sh
#
# Để dừng: nhấn Ctrl+C  — script sẽ tắt cả hai tiến trình
# =============================================================================

set -e

# ── Màu sắc ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Đường dẫn ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/starter_v0"
FRONTEND_DIR="$SCRIPT_DIR/web"

# ── PIDs để dọn dẹp khi thoát ────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW}⏹  Đang dừng các tiến trình...${RESET}"
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && echo -e "${RED}   ✗ Backend  stopped (PID $BACKEND_PID)${RESET}"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo -e "${RED}   ✗ Frontend stopped (PID $FRONTEND_PID)${RESET}"
    echo -e "${BOLD}👋 Bye!${RESET}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ── Banner ───────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║       🚀  Research Agent — Dev Launcher          ║"
echo "║   Backend: FastAPI (uvicorn)  •  Port 8000       ║"
echo "║   Frontend: Vite (React/TS)   •  Port 5173       ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${RESET}"

# ── Kiểm tra thư mục ─────────────────────────────────────────────────────────
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Không tìm thấy thư mục backend: $BACKEND_DIR${RESET}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Không tìm thấy thư mục frontend: $FRONTEND_DIR${RESET}"
    exit 1
fi

# ── Chọn Python interpreter (ưu tiên .venv trong starter_v0) ─────────────────
if [ -f "$BACKEND_DIR/.venv/Scripts/python" ]; then
    PYTHON="$BACKEND_DIR/.venv/Scripts/python"           # Windows Git Bash
elif [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    PYTHON="$BACKEND_DIR/.venv/bin/python"               # Linux / macOS
elif [ -f "$SCRIPT_DIR/.venv/Scripts/python" ]; then
    PYTHON="$SCRIPT_DIR/.venv/Scripts/python"
elif [ -f "$SCRIPT_DIR/.venv/bin/python" ]; then
    PYTHON="$SCRIPT_DIR/.venv/bin/python"
else
    PYTHON="python"
    echo -e "${YELLOW}⚠  Không tìm thấy .venv — dùng python hệ thống${RESET}"
fi

echo -e "${GREEN}🐍 Python: ${PYTHON}${RESET}"

# ── Kiểm tra node_modules ────────────────────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}📦 node_modules chưa tồn tại, đang chạy npm install...${RESET}"
    (cd "$FRONTEND_DIR" && npm install)
fi

# ── Khởi động Backend ────────────────────────────────────────────────────────
echo -e "\n${GREEN}▶  Khởi động Backend  →  http://localhost:8000${RESET}"
echo -e "   Docs: ${CYAN}http://localhost:8000/docs${RESET}"
(
    cd "$BACKEND_DIR"
    "$PYTHON" -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!
echo -e "   PID: ${BOLD}$BACKEND_PID${RESET}"

# ── Khởi động Frontend ───────────────────────────────────────────────────────
echo -e "\n${GREEN}▶  Khởi động Frontend →  http://localhost:5173${RESET}"
(
    cd "$FRONTEND_DIR"
    npm run dev
) &
FRONTEND_PID=$!
echo -e "   PID: ${BOLD}$FRONTEND_PID${RESET}"

# ── Chờ ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}✅ Cả hai tiến trình đã khởi động.${RESET}"
echo -e "${YELLOW}   Nhấn ${BOLD}Ctrl+C${RESET}${YELLOW} để dừng tất cả.${RESET}\n"

wait
