#!/usr/bin/env bash
# اجرای مالی‌نما روی آی‌پی ماشین (پورت پیش‌فرض 3000)
# آی‌پی با scripts/detect-ip.sh از «ip a» خوانده می‌شود.
# bind روی 0.0.0.0 است تا روی همان آی‌پی شبکه در دسترس باشد.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="prod"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) MODE="dev"; shift ;;
    --prod) MODE="prod"; shift ;;
    --host|-H) HOST="${2:-}"; shift 2 ;;
    --port|-p) PORT="${2:-}"; shift 2 ;;
    -h|--help)
      echo "Usage: bash scripts/start.sh [--dev|--prod] [--host 0.0.0.0] [--port 3000]"
      exit 0
      ;;
    *)
      # سازگاری با آرگومان‌های next که گاهی از npm -- پاس می‌شود
      if [[ "$1" == "-H" || "$1" == "--hostname" ]]; then
        HOST="${2:-}"; shift 2
      elif [[ "$1" == "-p" || "$1" == "--port" ]]; then
        PORT="${2:-}"; shift 2
      else
        shift
      fi
      ;;
  esac
done

[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "پورت نامعتبر: $PORT" >&2; exit 1; }

IP="$(bash "$ROOT_DIR/scripts/detect-ip.sh")"

echo "==> آی‌پی ماشین (از ip a): ${IP}"
echo "==> bind: ${HOST}:${PORT}"
echo "==> آدرس شبکه: http://${IP}:${PORT}"

export NODE_ENV="${NODE_ENV:-}"
if [[ "$MODE" == "dev" ]]; then
  export NODE_ENV="${NODE_ENV:-development}"
  exec npx next dev -H "$HOST" -p "$PORT"
else
  export NODE_ENV=production
  exec npx next start -H "$HOST" -p "$PORT"
fi
