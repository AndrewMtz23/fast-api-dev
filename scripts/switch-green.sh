#!/usr/bin/env bash
set -euo pipefail

# The Switch: sends traffic to the Green environment.
export APP_TARGET_IP="${APP_TARGET_IP:-192.168.1.20}"
export APP_TARGET_PORT="${APP_TARGET_PORT:-8080}"
export DEPLOYMENT_COLOR="${DEPLOYMENT_COLOR:-Green}"

TEMPLATE_PATH="${TEMPLATE_PATH:-./nginx.conf.template}"
TARGET_PATH="${TARGET_PATH:-/etc/nginx/sites-enabled/default}"
TEMP_PATH="$(mktemp)"
BACKUP_DIR="${BACKUP_DIR:-/etc/nginx/backups}"
BACKUP_PATH=""

cleanup() {
  rm -f "$TEMP_PATH"
}
trap cleanup EXIT

if ! command -v envsubst >/dev/null 2>&1; then
  echo "Error: envsubst is not installed. Install gettext-base first." >&2
  exit 1
fi

envsubst '${APP_TARGET_IP} ${APP_TARGET_PORT} ${DEPLOYMENT_COLOR}' < "$TEMPLATE_PATH" > "$TEMP_PATH"

if [ -f "$TARGET_PATH" ]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_PATH="${BACKUP_DIR}/default.bak.$(date +%Y%m%d%H%M%S)"
  cp "$TARGET_PATH" "$BACKUP_PATH"
fi

install -m 0644 "$TEMP_PATH" "$TARGET_PATH"

if nginx -t; then
  systemctl reload nginx
  echo "Nginx switched to ${DEPLOYMENT_COLOR}: ${APP_TARGET_IP}:${APP_TARGET_PORT}"
else
  if [ -n "$BACKUP_PATH" ]; then
    cp "$BACKUP_PATH" "$TARGET_PATH"
  else
    rm -f "$TARGET_PATH"
  fi
  echo "Error: Nginx configuration test failed. Service was not reloaded." >&2
  exit 1
fi
