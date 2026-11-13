#!/usr/bin/env bash
# مالی‌نما — نصب یک‌مرحله‌ای روی Ubuntu 24.04 با سرویس systemctl
#
# روی ماشین جدید فقط یکی از این‌ها را اجرا کنید:
#
#   curl -fsSL https://raw.githubusercontent.com/arynishere/accounting/main/bootstrap-ubuntu24.sh | bash
#
# یا بعد از کلون:
#
#   git clone https://github.com/arynishere/accounting.git
#   cd accounting && bash bootstrap-ubuntu24.sh
#
# سرویس همیشه به صورت systemctl نصب می‌شود (mali-namay).

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/arynishere/accounting.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
DEFAULT_DIR="${HOME}/mali-namay"
INSTALL_DIR=""
PORT="${PORT:-3000}"
MODE="prod"
USE_SYSTEMD=1
DO_START=1

log()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: bash bootstrap-ubuntu24.sh [options]

Options:
  --dir PATH      مسیر نصب (پیش‌فرض: ~/mali-namay یا همین ریپو)
  --port N        پورت (پیش‌فرض 3000)
  --dev           حالت توسعه (بدون systemd)
  --prod          بیلد production + systemd (پیش‌فرض)
  --systemd       سرویس systemctl (پیش‌فرض)
  --no-systemd    بدون systemd
  --no-start      فقط نصب/بیلد
  -h, --help      راهنما

بعد از نصب:
  sudo systemctl status mali-namay
  sudo systemctl restart mali-namay
  journalctl -u mali-namay -f
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="${2:-}"; shift 2 ;;
    --port) PORT="${2:-}"; shift 2 ;;
    --dev) MODE="dev"; USE_SYSTEMD=0; shift ;;
    --prod) MODE="prod"; shift ;;
    --systemd) USE_SYSTEMD=1; shift ;;
    --no-systemd) USE_SYSTEMD=0; shift ;;
    --no-start) DO_START=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "گزینه ناشناخته: $1" ;;
  esac
done

[[ "$PORT" =~ ^[0-9]+$ ]] || die "پورت نامعتبر: $PORT"

sudo_run() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    die "برای نصب پکیج‌ها / سرویس systemctl به root/sudo نیاز است"
  fi
}

detect_ubuntu() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    echo "${ID:-unknown}|${VERSION_ID:-}|${PRETTY_NAME:-unknown}"
  else
    echo "unknown||"
  fi
}

ensure_apt_packages() {
  log "نصب پکیج‌های پایه سیستم (git, curl, build tools)"
  sudo_run apt-get update -y
  sudo_run DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates curl git build-essential python3
  ok "پکیج‌های پایه نصب شدند"
}

node_major() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0
}

ensure_node() {
  local major
  major="$(node_major)"
  if command -v node >/dev/null 2>&1 && (( major >= 20 )); then
    ok "Node $(node -v) / npm $(npm -v)"
    return
  fi

  log "نصب Node.js 22 (NodeSource) برای Ubuntu"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo_run -E bash -
  sudo_run DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  hash -r || true
  command -v node >/dev/null 2>&1 || die "نصب Node ناموفق بود"
  major="$(node_major)"
  (( major >= 20 )) || die "Node خیلی قدیمی است: $(node -v)"
  ok "Node $(node -v) / npm $(npm -v)"
}

in_repo_root() {
  [[ -f "./package.json" && -f "./install.sh" ]]
}

resolve_install_dir() {
  if [[ -n "$INSTALL_DIR" ]]; then
    echo "$INSTALL_DIR"
    return
  fi
  if in_repo_root; then
    pwd
    return
  fi
  echo "$DEFAULT_DIR"
}

clone_or_update() {
  local dir="$1"
  if [[ -f "$dir/package.json" && -f "$dir/install.sh" ]]; then
    log "به‌روزرسانی ریپو در $dir"
    if [[ -d "$dir/.git" ]]; then
      git -C "$dir" fetch --depth 1 origin "$REPO_BRANCH" || true
      git -C "$dir" checkout "$REPO_BRANCH" || true
      git -C "$dir" pull --ff-only origin "$REPO_BRANCH" || warn "pull ناموفق؛ با نسخه موجود ادامه می‌دهیم"
    else
      warn "پوشه موجود است ولی git نیست؛ همان را استفاده می‌کنیم"
    fi
    return
  fi

  if [[ -e "$dir" ]] && [[ -n "$(ls -A "$dir" 2>/dev/null || true)" ]]; then
    die "مسیر $dir خالی نیست و ریپو مالی‌نما نیست. با --dir مسیر دیگری بدهید."
  fi

  log "کلون ریپو → $dir"
  mkdir -p "$(dirname "$dir")"
  git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$dir"
  ok "کلون شد"
}

main() {
  local os_info id ver pretty dir
  os_info="$(detect_ubuntu)"
  id="${os_info%%|*}"
  rest="${os_info#*|}"
  ver="${rest%%|*}"
  pretty="${rest#*|}"

  log "شروع نصب مالی‌نما (systemctl)"
  echo "  سیستم: ${pretty}"
  echo "  ریپو:  ${REPO_URL} (${REPO_BRANCH})"

  if [[ "$id" != "ubuntu" ]]; then
    warn "این اسکریپت برای Ubuntu 24 نوشته شده؛ سیستم فعلی: ${pretty}"
  elif [[ "$ver" != "24.04" && "$ver" != "24.10" ]]; then
    warn "نسخه Ubuntu شما ${ver} است (هدف: 24.04) — ادامه می‌دهیم"
  fi

  ensure_apt_packages
  ensure_node

  dir="$(resolve_install_dir)"
  if ! in_repo_root || [[ -n "${INSTALL_DIR}" ]]; then
    clone_or_update "$dir"
  else
    dir="$(pwd)"
    ok "اجرا از داخل ریپو: $dir"
  fi

  cd "$dir"
  chmod +x install.sh bootstrap-ubuntu24.sh scripts/*.sh 2>/dev/null || true

  # مالکیت را برای کاربر واقعی نگه دار (اگر با sudo کلون شده)
  if [[ "$(id -u)" -eq 0 && -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    chown -R "${SUDO_USER}:${SUDO_USER}" "$dir" || true
  fi

  log "اجرای install.sh"
  local args=()
  if [[ "$MODE" == "dev" ]]; then
    args+=(--dev)
  else
    args+=(--prod)
  fi
  args+=(--port "$PORT")
  [[ "$DO_START" -eq 0 ]] && args+=(--no-start)
  if [[ "$USE_SYSTEMD" -eq 1 ]]; then
    args+=(--systemd)
  else
    args+=(--no-systemd)
  fi

  # systemd همیشه با sudo
  if [[ "$USE_SYSTEMD" -eq 1 ]]; then
    sudo_run bash install.sh "${args[@]}"
  else
    bash install.sh "${args[@]}"
  fi

  local ip
  ip="$(bash "$dir/scripts/detect-ip.sh" 2>/dev/null || true)"
  ip="${ip:-127.0.0.1}"

  echo
  ok "تمام — سرویس systemctl روی آی‌پی ماشین"
  echo "  مسیر:      $dir"
  echo "  اصلی:      http://${ip}:${PORT}"
  echo "  تنظیمات:   http://${ip}:${PORT}/settings"
  if [[ "$USE_SYSTEMD" -eq 1 ]]; then
    echo "  سرویس:     mali-namay"
    echo "  وضعیت:     sudo systemctl status mali-namay"
    echo "  لاگ:       journalctl -u mali-namay -f"
    echo "  ری‌استارت:  sudo systemctl restart mali-namay"
    echo "  توقف:      sudo systemctl stop mali-namay"
  else
    echo "  توقف:      bash $dir/scripts/stop.sh"
  fi
}

main
