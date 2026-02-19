#!/bin/bash

# Flow Stock Game - Dev Server Stop Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.dev-server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "[INFO] 실행 중인 서버가 없습니다."
  exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
  echo "[INFO] 서버 종료 중... (PID: $PID)"
  kill "$PID"
  rm -f "$PID_FILE"
  echo "[INFO] 서버가 종료되었습니다."
else
  echo "[INFO] 서버가 이미 종료된 상태입니다."
  rm -f "$PID_FILE"
fi
