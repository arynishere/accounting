#!/usr/bin/env bash
# توقف مالی‌نما — اولویت با systemctl
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/logs/app.pid"
UNIT="mali-namay.service"

sudo_run() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
}

if systemctl list-unit-files "${UNIT}" >/dev/null 2>&1 \
  || [[ -f "/etc/systemd/system/${UNIT}" ]]; then
  if systemctl is-active --quiet "${UNIT}" 2>/dev/null \
    || systemctl is-enabled --quiet "${UNIT}" 2>/dev/null; then
    sudo_run systemctl stop "${UNIT}"
    echo "سرویس ${UNIT} متوقف شد (systemctl stop)"
    exit 0
  fi
fi

if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" || true
    echo "پروسه $pid متوقف شد"
  fi
  rm -f "$PID_FILE"
  exit 0
fi

echo "سرویس فعالی پیدا نشد. در صورت نیاز:"
echo "  sudo systemctl stop mali-namay"
echo "  pkill -f 'next (dev|start)'"
