#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/logs/app.pid"

if [[ -f /etc/systemd/system/mali-namay.service ]] && systemctl is-active --quiet mali-namay.service 2>/dev/null; then
  sudo systemctl stop mali-namay.service
  echo "سرویس mali-namay متوقف شد"
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" || true
    echo "پروسه $pid متوقف شد"
  fi
  rm -f "$PID_FILE"
else
  echo "PID پیدا نشد؛ در صورت نیاز: pkill -f 'next (dev|start)'"
fi
