# =============================================================================
# start.ps1 — Khởi động Backend (FastAPI) + Frontend (Vite) cùng lúc
# =============================================================================
# Cách dùng (PowerShell):
#   .\start.ps1
#
# Nếu bị lỗi execution policy, chạy trước:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# =============================================================================

$ErrorActionPreference = "Stop"

# ── Màu sắc helper ───────────────────────────────────────────────────────────
function Write-Color($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

# ── Đường dẫn ────────────────────────────────────────────────────────────────
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir  = Join-Path $ScriptDir "starter_v0"
$FrontendDir = Join-Path $ScriptDir "web"

# ── Banner ───────────────────────────────────────────────────────────────────
Write-Color ""
Write-Color "╔══════════════════════════════════════════════════╗" Cyan
Write-Color "║       🚀  Research Agent — Dev Launcher          ║" Cyan
Write-Color "║   Backend: FastAPI (uvicorn)  •  Port 8000       ║" Cyan
Write-Color "║   Frontend: Vite (React/TS)   •  Port 5173       ║" Cyan
Write-Color "╚══════════════════════════════════════════════════╝" Cyan
Write-Color ""

# ── Kiểm tra thư mục ─────────────────────────────────────────────────────────
if (-not (Test-Path $BackendDir)) {
    Write-Color "❌ Không tìm thấy thư mục backend: $BackendDir" Red
    exit 1
}
if (-not (Test-Path $FrontendDir)) {
    Write-Color "❌ Không tìm thấy thư mục frontend: $FrontendDir" Red
    exit 1
}

# ── Chọn Python interpreter ───────────────────────────────────────────────────
$VenvPython = @(
    "$BackendDir\.venv\Scripts\python.exe",
    "$ScriptDir\.venv\Scripts\python.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($VenvPython) {
    $PythonExe = $VenvPython
    Write-Color "🐍 Python: $PythonExe" Green
} else {
    $PythonExe = "python"
    Write-Color "⚠  Không tìm thấy .venv — dùng python hệ thống" Yellow
}

# ── Kiểm tra node_modules ────────────────────────────────────────────────────
if (-not (Test-Path "$FrontendDir\node_modules")) {
    Write-Color "📦 node_modules chưa tồn tại, đang chạy npm install..." Yellow
    Push-Location $FrontendDir
    npm install
    Pop-Location
}

# ── Khởi động Backend ────────────────────────────────────────────────────────
Write-Color ""
Write-Color "▶  Khởi động Backend  →  http://localhost:8000" Green
Write-Color "   Docs: http://localhost:8000/docs" Cyan

$BackendJob = Start-Job -ScriptBlock {
    param($dir, $python)
    Set-Location $dir
    & $python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $BackendDir, $PythonExe

Write-Color "   Job ID: $($BackendJob.Id)" White

# ── Khởi động Frontend ───────────────────────────────────────────────────────
Write-Color ""
Write-Color "▶  Khởi động Frontend →  http://localhost:5173" Green

$FrontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $FrontendDir

Write-Color "   Job ID: $($FrontendJob.Id)" White

# ── Vòng lặp chờ & in log ────────────────────────────────────────────────────
Write-Color ""
Write-Color "✅ Cả hai tiến trình đã khởi động." White
Write-Color "   Nhấn Ctrl+C để dừng tất cả." Yellow
Write-Color ""

try {
    while ($true) {
        # In output của backend
        $backOutput = Receive-Job -Job $BackendJob 2>&1
        if ($backOutput) {
            $backOutput | ForEach-Object { Write-Color "[BACKEND]  $_" Cyan }
        }

        # In output của frontend
        $frontOutput = Receive-Job -Job $FrontendJob 2>&1
        if ($frontOutput) {
            $frontOutput | ForEach-Object { Write-Color "[FRONTEND] $_" Green }
        }

        # Kiểm tra nếu job bị lỗi
        if ($BackendJob.State -eq "Failed") {
            Write-Color "[BACKEND] ❌ Đã dừng bất ngờ!" Red
            Receive-Job -Job $BackendJob | Write-Host
        }
        if ($FrontendJob.State -eq "Failed") {
            Write-Color "[FRONTEND] ❌ Đã dừng bất ngờ!" Red
            Receive-Job -Job $FrontendJob | Write-Host
        }

        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Color ""
    Write-Color "⏹  Đang dừng các tiến trình..." Yellow
    Stop-Job  -Job $BackendJob,  $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $BackendJob, $FrontendJob -Force -ErrorAction SilentlyContinue
    Write-Color "👋 Bye!" White
}
