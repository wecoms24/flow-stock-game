#!/bin/bash

# Flow Stock Game - Dev Server Start Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

# node_modules 없으면 설치
if [ ! -d "node_modules" ]; then
  echo "[INFO] 의존성 설치 중..."
  npm install
fi

echo "[INFO] 개발 서버 시작 중... (http://localhost:5173)"
echo "[INFO] 종료: Ctrl+C"
echo ""

npm run dev
