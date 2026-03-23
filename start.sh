#!/bin/bash
# Flow Stock Game - 백그라운드 서버 관리 스크립트
# 사용법: ./start.sh {start|stop|restart|status|log}

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.dev-server.pid"
SERVER_LOG="$PROJECT_DIR/.dev-server.log"
PORT=5173

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

do_start() {
  if is_running; then
    echo "[WARN] 이미 실행 중 (PID: $(cat "$PID_FILE"))"
    exit 0
  fi

  # 포트 충돌 정리
  if lsof -i :$PORT -t >/dev/null 2>&1; then
    echo "[INFO] 포트 $PORT 사용 중인 프로세스 종료..."
    lsof -i :$PORT -t | xargs kill 2>/dev/null
    sleep 2
  fi

  cd "$PROJECT_DIR"

  # node_modules 확인
  [ ! -d "node_modules" ] && echo "[INFO] npm install..." && npm install

  # sql-wasm.wasm 복사
  WASM_DST="$PROJECT_DIR/public/sql-wasm.wasm"
  WASM_SRC="$PROJECT_DIR/node_modules/sql.js/dist/sql-wasm.wasm"
  [ ! -f "$WASM_DST" ] && [ -f "$WASM_SRC" ] && cp "$WASM_SRC" "$WASM_DST"

  # 서버 시작 (외부 접속 허용)
  echo "[INFO] 서버 시작 중..."
  nohup npx vite --host 0.0.0.0 --port $PORT > "$SERVER_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 3

  if is_running; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    echo "✅ 서버 시작 완료"
    echo "   로컬:  http://localhost:$PORT"
    echo "   외부:  http://${IP:-<서버IP>}:$PORT"
    echo "   PID:   $(cat "$PID_FILE")"
    echo "   로그:  tail -f $SERVER_LOG"
  else
    echo "❌ 서버 시작 실패. 로그: $SERVER_LOG"
    rm -f "$PID_FILE"
    exit 1
  fi
}

do_stop() {
  if is_running; then
    kill "$(cat "$PID_FILE")"
    rm -f "$PID_FILE"
    echo "✅ 서버 종료"
  else
    echo "실행 중인 서버 없음"
    rm -f "$PID_FILE" 2>/dev/null
  fi
}

case "${1:-start}" in
  start)   do_start ;;
  stop)    do_stop ;;
  restart) do_stop; sleep 2; do_start ;;
  status)
    if is_running; then
      echo "✅ 실행 중 (PID: $(cat "$PID_FILE"), 포트: $PORT)"
    else
      echo "❌ 중지됨"
    fi
    ;;
  log) tail -f "$SERVER_LOG" ;;
  *) echo "사용법: $0 {start|stop|restart|status|log}" ;;
esac
