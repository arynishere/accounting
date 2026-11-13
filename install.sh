#!/usr/bin/env bash
# مالی‌نمای یکپارچه — نصب و راه‌اندازی با سرویس systemctl
# استفاده:
#   sudo bash install.sh                 # پیش‌فرض: بیلد + سرویس mali-namay
#   sudo bash install.sh --port 3000
#   bash install.sh --no-systemd         # بدون systemd (nohup)
#   bash install.sh --dev                # حالت توسعه (بدون systemd)
#   bash install.sh --no-start           # فقط نصب/بیلد

set -euo pipefail

APP_NAME="mali-namay"
PORT="${PORT:-3000}"
MODE="prod"
DO_START=1
USE_SYSTEMD=1
HOST="0.0.0.0"
MIN_NODE_MAJOR=20

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: bash install.sh [options]

Options:
  --dev           نصب و اجرای حالت توسعه (next dev، بدون systemd)
  --prod          بیلد و اجرای production (پیش‌فرض)
  --port N        پورت سرویس (پیش‌فرض 3000)
  --host ADDR     آدرس bind (پیش‌فرض 0.0.0.0)
  --no-start      فقط نصب/بیلد؛ سرویس را اجرا نکن
  --systemd       سرویس systemctl (پیش‌فرض)
  --no-systemd    بدون systemd؛ اجرا با nohup
  -h, --help      راهنما

سرویس:
  sudo systemctl status mali-namay
  sudo systemctl restart mali-namay
  sudo systemctl stop mali-namay
  journalctl -u mali-namay -f
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) MODE="dev"; USE_SYSTEMD=0; shift ;;
    --prod) MODE="prod"; shift ;;
    --port) PORT="${2:-}"; shift 2 ;;
    --host) HOST="${2:-}"; shift 2 ;;
    --no-start) DO_START=0; shift ;;
    --systemd) USE_SYSTEMD=1; shift ;;
    --no-systemd) USE_SYSTEMD=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "گزینه ناشناخته: $1 (از --help استفاده کنید)" ;;
  esac
done

[[ "$PORT" =~ ^[0-9]+$ ]] || die "پورت نامعتبر: $PORT"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "دستور «$1» پیدا نشد. لطفاً نصب کنید."
}

install_node_hint() {
  cat <<'EOF'

Node.js نسخه 20 یا بالاتر لازم است.
روی Ubuntu/Debian:
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs

یا با nvm:
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install 22
EOF
}

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    install_node_hint
    die "Node.js نصب نیست"
  fi
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if (( major < MIN_NODE_MAJOR )); then
    install_node_hint
    die "نسخه Node شما $(node -v) است؛ حداقل v${MIN_NODE_MAJOR} لازم است"
  fi
  ok "Node $(node -v) / npm $(npm -v)"
}

detect_ip() {
  bash "$ROOT_DIR/scripts/detect-ip.sh"
}

sudo_run() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    die "برای سرویس systemctl به root/sudo نیاز است"
  fi
}

service_user() {
  if [[ "$(id -u)" -eq 0 ]]; then
    echo "${SUDO_USER:-root}"
  else
    echo "$(id -un)"
  fi
}

log "بررسی پیش‌نیازها"
need_cmd curl
check_node

log "ایجاد پوشه‌های لازم"
mkdir -p "$ROOT_DIR/data" "$ROOT_DIR/logs"
chmod +x "$ROOT_DIR/scripts/"*.sh 2>/dev/null || true
ok "data/ و logs/ آماده است"

log "نصب وابستگی‌ها (npm install)"
npm install
ok "پکیج‌ها نصب شدند"

if [[ "$MODE" == "prod" ]]; then
  log "بیلد production"
  npm run build
  ok "بیلد تمام شد"
fi

write_systemd() {
  local unit="/etc/systemd/system/${APP_NAME}.service"
  local user
  user="$(service_user)"
  local node_dir
  node_dir="$(dirname "$(command -v node)")"

  log "نصب سرویس systemctl: ${APP_NAME}.service"

  sudo_run tee "$unit" >/dev/null <<EOF
[Unit]
Description=Mali Namay Unified Dashboard (CRM / Holoo / Sepidar)
Documentation=https://github.com/arynishere/accounting
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${ROOT_DIR}
User=${user}
Group=${user}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=HOST=${HOST}
Environment=PATH=${node_dir}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/bin/bash ${ROOT_DIR}/scripts/start.sh --prod --host ${HOST} --port ${PORT}
Restart=always
RestartSec=5
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

  sudo_run systemctl daemon-reload
  sudo_run systemctl enable "${APP_NAME}.service"
  sudo_run systemctl restart "${APP_NAME}.service"
  ok "سرویس systemd فعال شد: ${APP_NAME}.service"
  sudo_run systemctl --no-pager --full status "${APP_NAME}.service" || true
}

start_app() {
  local ip
  ip="$(detect_ip)"
  HOST="${HOST:-0.0.0.0}"
  PORT="${PORT:-3000}"

  log "آی‌پی ماشین از ip a: ${ip}"
  echo "  آدرس اصلی: http://${ip}:${PORT}"

  if [[ "$USE_SYSTEMD" -eq 1 ]]; then
    write_systemd

    for _ in $(seq 1 45); do
      if curl -fsS "http://${ip}:${PORT}/" >/dev/null 2>&1 \
        || curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    echo
    ok "سرویس systemctl روی آی‌پی ماشین بالا آمد"
    echo "  آدرس:     http://${ip}:${PORT}"
    echo "  تنظیمات:  http://${ip}:${PORT}/settings"
    echo "  وضعیت:    sudo systemctl status ${APP_NAME}"
    echo "  لاگ:      journalctl -u ${APP_NAME} -f"
    echo "  ری‌استارت: sudo systemctl restart ${APP_NAME}"
    echo "  توقف:     sudo systemctl stop ${APP_NAME}"
    return
  fi

  if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    warn "پورت ${PORT} از قبل در حال استفاده است — همان را نگه می‌داریم"
    echo "  http://${ip}:${PORT}"
    return
  fi

  mkdir -p "$ROOT_DIR/logs"
  if [[ "$MODE" == "dev" ]]; then
    log "اجرای حالت توسعه — در دسترس روی http://${ip}:${PORT}"
    nohup bash "$ROOT_DIR/scripts/start.sh" --dev --host "$HOST" --port "$PORT" \
      >"$ROOT_DIR/logs/app.log" 2>&1 &
    echo $! >"$ROOT_DIR/logs/app.pid"
  else
    log "اجرای production (بدون systemd) — http://${ip}:${PORT}"
    nohup bash "$ROOT_DIR/scripts/start.sh" --prod --host "$HOST" --port "$PORT" \
      >"$ROOT_DIR/logs/app.log" 2>&1 &
    echo $! >"$ROOT_DIR/logs/app.pid"
  fi

  for _ in $(seq 1 45); do
    if curl -fsS "http://${ip}:${PORT}/" >/dev/null 2>&1 \
      || curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  echo
  ok "راه‌اندازی بدون systemd انجام شد"
  echo "  اصلی:    http://${ip}:${PORT}"
  echo "  تنظیمات: http://${ip}:${PORT}/settings"
  echo "  لاگ:     ${ROOT_DIR}/logs/app.log"
  echo "  توقف:    bash scripts/stop.sh"
}

log "خلاصه تنظیمات"
echo "  مسیر:    $ROOT_DIR"
echo "  حالت:    $MODE"
echo "  پورت:    $PORT"
echo "  Host:    $HOST"
echo "  systemd: $([[ "$USE_SYSTEMD" -eq 1 ]] && echo yes || echo no)"

if [[ "$DO_START" -eq 1 ]]; then
  start_app
else
  ok "نصب تمام شد (--no-start). برای فعال‌سازی سرویس:"
  echo "  sudo bash install.sh"
  echo "  # یا:"
  echo "  sudo systemctl enable --now ${APP_NAME}"
fi
