#!/usr/bin/env bash
# مالی‌نمای یکپارچه — نصب و راه‌اندازی با یک دستور
# استفاده:
#   bash install.sh
#   bash install.sh --dev          # حالت توسعه (hot reload)
#   bash install.sh --port 3000
#   bash install.sh --no-start     # فقط نصب، بدون اجرا
#   bash install.sh --systemd      # سرویس systemd (نیاز به root)

set -euo pipefail

APP_NAME="mali-namay"
PORT="${PORT:-3000}"
MODE="prod"
DO_START=1
USE_SYSTEMD=0
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
  --dev           نصب و اجرای حالت توسعه (next dev)
  --prod          بیلد و اجرای production (پیش‌فرض)
  --port N        پورت سرویس (پیش‌فرض 3000)
  --host ADDR     آدرس bind (پیش‌فرض 0.0.0.0)
  --no-start      فقط نصب/بیلد؛ اجرا نکن
  --systemd       ساخت و فعال‌سازی سرویس systemd
  -h, --help      راهنما
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) MODE="dev"; shift ;;
    --prod) MODE="prod"; shift ;;
    --port) PORT="${2:-}"; shift 2 ;;
    --host) HOST="${2:-}"; shift 2 ;;
    --no-start) DO_START=0; shift ;;
    --systemd) USE_SYSTEMD=1; shift ;;
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

primary_ip() {
  hostname -I 2>/dev/null | awk '{print $1}' || true
  ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' || true
}

detect_ip() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [[ -z "${ip:-}" ]]; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' || true)"
  fi
  echo "${ip:-127.0.0.1}"
}

log "بررسی پیش‌نیازها"
need_cmd curl
check_node

log "ایجاد پوشه‌های لازم"
mkdir -p "$ROOT_DIR/data" "$ROOT_DIR/logs"
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
  local node_bin npm_bin
  node_bin="$(command -v node)"
  npm_bin="$(command -v npm)"

  [[ "$(id -u)" -eq 0 ]] || die "برای --systemd باید با root اجرا کنید (sudo bash install.sh --systemd)"

  cat >"$unit" <<EOF
[Unit]
Description=Mali Namay Unified Dashboard (CRM / Holoo / Sepidar)
After=network.target

[Service]
Type=simple
WorkingDirectory=${ROOT_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=HOST=${HOST}
ExecStart=${npm_bin} run start -- -H ${HOST} -p ${PORT}
Restart=always
RestartSec=5
User=${SUDO_USER:-root}

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "${APP_NAME}.service"
  systemctl restart "${APP_NAME}.service"
  ok "سرویس systemd: ${APP_NAME}.service فعال شد"
  systemctl --no-pager --full status "${APP_NAME}.service" || true
}

start_app() {
  local ip
  ip="$(detect_ip)"

  if [[ "$USE_SYSTEMD" -eq 1 ]]; then
    write_systemd
    echo
    ok "برنامه در دسترس است:"
    echo "  http://${ip}:${PORT}"
    echo "  http://127.0.0.1:${PORT}"
    return
  fi

  # اگر پورت در حال استفاده است، پروسه قبلی next را متوقف نکن مگر خودمان باشیم
  if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    warn "پورت ${PORT} از قبل در حال استفاده است — همان را نگه می‌داریم"
    echo "  http://${ip}:${PORT}"
    return
  fi

  mkdir -p "$ROOT_DIR/logs"
  if [[ "$MODE" == "dev" ]]; then
    log "اجرای حالت توسعه روی ${HOST}:${PORT}"
    nohup npm run dev -- -H "$HOST" -p "$PORT" >"$ROOT_DIR/logs/app.log" 2>&1 &
    echo $! >"$ROOT_DIR/logs/app.pid"
  else
    log "اجرای production روی ${HOST}:${PORT}"
    nohup npm run start -- -H "$HOST" -p "$PORT" >"$ROOT_DIR/logs/app.log" 2>&1 &
    echo $! >"$ROOT_DIR/logs/app.pid"
  fi

  # صبر کوتاه برای بالا آمدن سرور
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  echo
  ok "نصب و راه‌اندازی انجام شد"
  echo "  لوکال:   http://127.0.0.1:${PORT}"
  echo "  شبکه:    http://${ip}:${PORT}"
  echo "  تنظیمات: http://${ip}:${PORT}/settings"
  echo "  لاگ:     ${ROOT_DIR}/logs/app.log"
  echo
  echo "توقف:"
  echo "  kill \$(cat logs/app.pid)"
}

log "خلاصه تنظیمات"
echo "  مسیر:  $ROOT_DIR"
echo "  حالت:  $MODE"
echo "  پورت:  $PORT"
echo "  Host:  $HOST"

if [[ "$DO_START" -eq 1 ]]; then
  start_app
else
  ok "نصب تمام شد (--no-start). برای اجرا:"
  if [[ "$MODE" == "dev" ]]; then
    echo "  npm run dev"
  else
    echo "  npm run start"
  fi
fi
