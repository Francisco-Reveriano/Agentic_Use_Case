#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ENV_FILE="$ROOT_DIR/.env"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env"
BACKEND_PORT=8000
FRONTEND_PORT=5173
BACKEND_PID=""
FRONTEND_PID=""

require_file() {
  local path="$1"
  local message="$2"

  if [[ ! -f "$path" ]]; then
    echo "$message" >&2
    exit 1
  fi
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

load_env_file() {
  local path="$1"
  local line=""
  local key=""
  local value=""

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    key="${line%%=*}"
    value="${line#*=}"

    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "$key=$value"
  done < "$path"
}

maybe_load_env_file() {
  local path="$1"

  if [[ -f "$path" ]]; then
    load_env_file "$path"
  fi
}

require_real_env_value() {
  local name="$1"
  local value="$2"
  local placeholder_fragment="$3"

  if [[ "$value" == *"$placeholder_fragment"* ]]; then
    echo "$name still contains a placeholder value. Update your environment before running." >&2
    exit 1
  fi
}

kill_port_processes() {
  local port="$1"
  local pids=""

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Stopping previous listeners on port $port: $pids"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Force-stopping listeners on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "$FRONTEND_PID" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true

  exit "$exit_code"
}

main() {
  require_command lsof
  require_command npm

  require_file "$ROOT_DIR/.venv/bin/python" "Missing Python virtualenv at .venv. Create it before running."
  require_file "$ROOT_DIR/.venv/bin/uvicorn" "Missing uvicorn in .venv. Run ./.venv/bin/pip install -r requirements.txt first."

  maybe_load_env_file "$BACKEND_ENV_FILE"
  maybe_load_env_file "$FRONTEND_ENV_FILE"
  if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
    maybe_load_env_file "$ROOT_DIR/frontend/.env.example"
  fi

  : "${DATABASE_URL:=${POSTGRES_URL:-${POSTGRES_PRISMA_URL:-}}}"
  : "${DATABASE_URL:?DATABASE_URL is required in .env}"
  : "${OPENAI_API_KEY:?OPENAI_API_KEY is required in .env}"
  : "${VITE_API_BASE_URL:=http://localhost:8000}"

  require_real_env_value "DATABASE_URL" "$DATABASE_URL" "your-neon-host"
  require_real_env_value "OPENAI_API_KEY" "$OPENAI_API_KEY" "your_openai_api_key_here"

  echo "Killing stale local processes..."
  kill_port_processes "$BACKEND_PORT"
  kill_port_processes "$FRONTEND_PORT"

  echo "Initializing Neon database schema..."
  "$ROOT_DIR/.venv/bin/python" -m backend.app.db.init_db

  trap cleanup EXIT INT TERM

  echo "Starting backend on http://127.0.0.1:$BACKEND_PORT ..."
  (
    cd "$ROOT_DIR"
    exec "$ROOT_DIR/.venv/bin/uvicorn" backend.app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
  ) &
  BACKEND_PID=$!

  echo "Starting frontend on http://127.0.0.1:$FRONTEND_PORT ..."
  (
    cd "$FRONTEND_DIR"
    exec npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
  ) &
  FRONTEND_PID=$!

  echo
  echo "Local app is starting:"
  echo "  Backend : http://127.0.0.1:$BACKEND_PORT"
  echo "  Frontend: http://127.0.0.1:$FRONTEND_PORT"
  echo
  echo "Press Ctrl+C to stop both services."

  wait -n "$BACKEND_PID" "$FRONTEND_PID"
}

main "$@"
