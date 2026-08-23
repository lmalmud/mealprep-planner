#!/usr/bin/env bash
#
# Start/stop the whole Macro & Market stack (backend + frontend) with one command.
#
#   ./scripts/dev.sh start     # start both services in the background
#   ./scripts/dev.sh stop      # stop both services
#   ./scripts/dev.sh restart   # stop then start
#   ./scripts/dev.sh status    # show whether each service is running
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUN_DIR="$ROOT_DIR/.run"
BACKEND_PORT=8000
FRONTEND_PORT=3000
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

log() { echo "[dev.sh] $*"; }

kill_port() {
  local port="$1"
  local name="$2"
  local pids
  pids="$(lsof -ti ":$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return 0
  fi

  log "Stopping $name on port $port (pid(s): $pids)"
  kill $pids 2>/dev/null || true

  for _ in $(seq 1 10); do
    pids="$(lsof -ti ":$port" -sTCP:LISTEN 2>/dev/null || true)"
    [ -z "$pids" ] && break
    sleep 0.5
  done

  pids="$(lsof -ti ":$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    log "$name still holding port $port, force killing (pid(s): $pids)"
    kill -9 $pids 2>/dev/null || true
  fi
}

# uvicorn --reload runs a parent supervisor plus a forked worker; killing only
# the worker (the one lsof finds bound to the port) leaves the supervisor
# alive to immediately respawn it. Kill anything matching the process name too.
kill_by_pattern() {
  local pattern="$1"
  local pids
  pids="$(pgrep -f "$pattern" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
    sleep 0.5
    pids="$(pgrep -f "$pattern" 2>/dev/null || true)"
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 40); do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "$label is up ($url)"
      return 0
    fi
    sleep 0.5
  done
  log "WARNING: $label did not respond at $url in time — check $RUN_DIR logs"
  return 1
}

cmd_status() {
  if lsof -ti ":$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Backend:  running on port $BACKEND_PORT"
  else
    log "Backend:  not running"
  fi
  if lsof -ti ":$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Frontend: running on port $FRONTEND_PORT"
  else
    log "Frontend: not running"
  fi
}

cmd_stop() {
  kill_port "$BACKEND_PORT" "backend"
  kill_by_pattern "uvicorn app.main:app"
  kill_port "$FRONTEND_PORT" "frontend"
  kill_by_pattern "next-server|frontend/node_modules/.bin/next"
  log "Stopped."
}

cmd_start() {
  mkdir -p "$RUN_DIR"

  [ -f "$BACKEND_DIR/.env" ] || cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  [ -f "$FRONTEND_DIR/.env.local" ] || cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.local"

  if [ ! -d "$VENV_DIR" ]; then
    log "Creating Python virtualenv at $VENV_DIR"
    python3 -m venv "$VENV_DIR"
  fi

  if ! "$VENV_DIR/bin/python" -c "import fastapi, uvicorn, alembic" >/dev/null 2>&1; then
    log "Installing backend dependencies"
    "$VENV_DIR/bin/python" -m pip install -e "$BACKEND_DIR[dev]"
  fi

  log "Applying database migrations"
  (cd "$BACKEND_DIR" && "$VENV_DIR/bin/python" -m alembic upgrade head)

  if lsof -ti ":$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Backend already running on port $BACKEND_PORT, leaving it as-is"
  else
    log "Starting backend on port $BACKEND_PORT (log: $BACKEND_LOG)"
    # Must run with CWD = backend/, not repo root: DATABASE_URL in backend/.env
    # is a relative sqlite path ("./mealprep.db") resolved against the
    # process's working directory, so running from the wrong directory
    # silently creates/uses a second, divergent database file.
    (cd "$BACKEND_DIR" && nohup "$VENV_DIR/bin/python" -m uvicorn app.main:app --reload \
      >"$BACKEND_LOG" 2>&1 &)
  fi

  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log "Installing frontend dependencies"
    (cd "$FRONTEND_DIR" && npm install)
  fi

  if lsof -ti ":$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Frontend already running on port $FRONTEND_PORT, leaving it as-is"
  else
    log "Starting frontend on port $FRONTEND_PORT (log: $FRONTEND_LOG)"
    (cd "$FRONTEND_DIR" && nohup npm run dev >"$FRONTEND_LOG" 2>&1 &)
  fi

  wait_for_http "http://127.0.0.1:$BACKEND_PORT/api/health" "Backend"
  wait_for_http "http://localhost:$FRONTEND_PORT" "Frontend"

  log "Backend:  http://127.0.0.1:$BACKEND_PORT"
  log "Frontend: http://localhost:$FRONTEND_PORT"
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  restart)
    cmd_stop
    cmd_start
    ;;
  status) cmd_status ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
