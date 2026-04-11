#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
ENV_DIR="${ENV_DIR:-/etc/nginx/environments}"
MASTER_LINK="${MASTER_LINK:-/etc/nginx/conf.d/default.conf}"

case "$ENVIRONMENT" in
  blue)
    TARGET_CONF="${ENV_DIR}/nginx_blue.conf"
    ;;
  green)
    TARGET_CONF="${ENV_DIR}/nginx_green.conf"
    ;;
  *)
    echo "Usage: $0 <blue|green>" >&2
    exit 1
    ;;
esac

if [ ! -f "$TARGET_CONF" ]; then
  echo "Error: target config not found: $TARGET_CONF" >&2
  exit 1
fi

ln -sf "$TARGET_CONF" "$MASTER_LINK"

if nginx -t; then
  systemctl reload nginx
  echo "Nginx switched to ${ENVIRONMENT}: ${TARGET_CONF} -> ${MASTER_LINK}"
else
  echo "Error: Nginx configuration test failed. Service was not reloaded." >&2
  exit 1
fi
