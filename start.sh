#!/bin/bash

# Flow Stock Game - Dev Server Start Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.dev-server.pid"
LOG_FILE="$PROJECT_DIR/.dev-server.log"

echo "=== Flow Stock Game Dev Server ==="
echo "Project: $PROJECT_DIR"

# Node.js 설치 확인
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js가 설치되어 있지 않습니다."
  exit 1
fi

# npm 설치 확인
if ! command -v npm &> /dev/null; then
  echo "[ERROR] npm이 설치되어 있지 않습니다."
  exit 1
fi

cd "$PROJECT_DIR"

# 이미 실행 중인지 확인
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[WARN] 서버가 이미 실행 중입니다. (PID: $OLD_PID)"
    echo "[INFO] 종료하려면: kill $OLD_PID 또는 stop.sh 실행"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# node_modules 없으면 설치
if [ ! -d "node_modules" ]; then
  echo "[INFO] 의존성 설치 중..."
  npm install
fi

echo "[INFO] 개발 서버를 백그라운드로 시작합니다..."
echo "[INFO] 로그: $LOG_FILE"

# 백그라운드 실행 (--host 0.0.0.0 으로 외부 접속 허용)
nohup npm run dev -- --host 0.0.0.0 > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

echo "[INFO] 서버 시작됨 (PID: $SERVER_PID)"
echo "[INFO] 로컬:   http://localhost:5173"
echo "[INFO] 외부:   http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<서버IP>'):5173"
echo "[INFO] 종료:   kill $SERVER_PID  또는  stop.sh 실행"
echo ""
echo "[INFO] 실시간 로그 확인: tail -f $LOG_FILE"
