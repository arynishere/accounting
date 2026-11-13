#!/usr/bin/env bash
# آی‌پی اصلی ماشین را از خروجی ip a / ip addr می‌گیرد.
# اولویت: IPv4 سراسری روی اینترفیس واقعی (نه docker/lo/veth)

set -euo pipefail

detect_ip() {
  local ip=""

  # 1) از ip -4 addr / ip a — اولین IPv4 سراسری غیرمجازی
  if command -v ip >/dev/null 2>&1; then
    ip="$(
      ip -4 -o addr show scope global 2>/dev/null \
        | awk '
          $2 ~ /^(lo|docker|br-|veth|virbr|cni|flannel|tun|tap)/ { next }
          {
            split($4, a, "/")
            if (a[1] != "" && a[1] !~ /^127\./) { print a[1]; exit }
          }'
    )"

    # اگر همه اینترفیس‌ها فیلتر شدند، هر IPv4 سراسری
    if [[ -z "${ip:-}" ]]; then
      ip="$(
        ip -4 -o addr show scope global 2>/dev/null \
          | awk '{ split($4, a, "/"); if (a[1] != "") { print a[1]; exit } }'
      )"
    fi

    # fallback: منبع مسیر پیش‌فرض
    if [[ -z "${ip:-}" ]]; then
      ip="$(
        ip -4 route get 1.1.1.1 2>/dev/null \
          | awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }'
      )"
    fi
  fi

  # 2) hostname -I
  if [[ -z "${ip:-}" ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi

  echo "${ip:-127.0.0.1}"
}

detect_ip
