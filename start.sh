#!/bin/bash

# Flow Stock Game - Dev Server Start Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.dev-server.pid"
SERVER_LOG="$PROJECT_DIR/.dev-server.log"
BUILD_LOG="$PROJECT_DIR/.build-kospi.log"
KOSPI_DB="$PROJECT_DIR/public/kospi-historical.db"
KOSPI_SCRIPT="$PROJECT_DIR/scripts/build_kospi_db.py"

echo "=== Flow Stock Game Dev Server ==="
echo "Project: $PROJECT_DIR"

# ── Node.js 확인 ──
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js가 설치되어 있지 않습니다."
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "[ERROR] npm이 설치되어 있지 않습니다."
  exit 1
fi

cd "$PROJECT_DIR"

# ── node_modules 없으면 설치 ──
if [ ! -d "node_modules" ]; then
  echo "[INFO] npm 의존성 설치 중..."
  npm install
fi

# ── sql-wasm.wasm 확인 및 복사 ──
WASM_DST="$PROJECT_DIR/public/sql-wasm.wasm"
WASM_SRC="$PROJECT_DIR/node_modules/sql.js/dist/sql-wasm.wasm"
if [ ! -f "$WASM_DST" ] && [ -f "$WASM_SRC" ]; then
  echo "[INFO] sql-wasm.wasm 복사 중..."
  cp "$WASM_SRC" "$WASM_DST"
fi

# ── KOSPI DB 빌드 (없는 경우에만) ──
if [ ! -f "$KOSPI_DB" ]; then
  echo "[INFO] KOSPI DB가 없습니다. 빌드를 시작합니다..."
  echo "[INFO] 빌드 로그: $BUILD_LOG"

  # Python 확인
  PYTHON=""
  for py in python3 python; do
    if command -v "$py" &> /dev/null; then
      PYTHON="$py"
      break
    fi
  done

  if [ -z "$PYTHON" ]; then
    echo "[ERROR] Python이 설치되어 있지 않습니다. KOSPI DB 빌드를 건너뜁니다."
    echo "[WARN]  수동으로 'python3 scripts/build_kospi_db.py'를 실행하세요."
  else
    echo "[INFO] Python: $($PYTHON --version 2>&1)"
    echo "[INFO] 빌드 중... (수 분 소요, 로그: $BUILD_LOG)"
    "$PYTHON" "$KOSPI_SCRIPT" 2>&1 | tee "$BUILD_LOG"
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
      echo "[INFO] KOSPI DB 빌드 완료: $KOSPI_DB"
    else
      echo "[WARN] KOSPI DB 빌드 실패. 로그 확인: $BUILD_LOG"
    fi
  fi
else
  echo "[INFO] KOSPI DB 이미 존재: $KOSPI_DB"
fi

# ── 이미 실행 중인지 확인 ──
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[WARN] 서버가 이미 실행 중입니다. (PID: $OLD_PID)"
    echo "[INFO] 종료하려면: ./stop.sh"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# ── 백그라운드 서버 시작 (--host 0.0.0.0 으로 외부 접속 허용) ──
echo ""
echo "[INFO] 개발 서버를 백그라운드로 시작합니다..."
echo "[INFO] 서버 로그: $SERVER_LOG"

nohup npm run dev -- --host 0.0.0.0 > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

echo "[INFO] 서버 시작됨 (PID: $SERVER_PID)"
echo "[INFO] 로컬:   http://localhost:5173"
echo "[INFO] 외부:   http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<서버IP>'):5173"
echo "[INFO] 종료:   ./stop.sh"
echo ""
echo "[INFO] 실시간 로그 확인: tail -f $SERVER_LOG"
