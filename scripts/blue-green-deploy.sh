#!/usr/bin/env bash
set -euo pipefail

IMAGE="${IMAGE:?IMAGE is required}"
STATE_FILE="${STATE_FILE:-/etc/nginx/current_deploy.env}"
TEMPLATE_PATH="${TEMPLATE_PATH:-/etc/nginx/templates/pipeline-blue-green.conf.template}"
NGINX_CONFIG_PATH="${NGINX_CONFIG_PATH:-/etc/nginx/conf.d/default.conf}"
APP_TARGET_IP="${APP_TARGET_IP:-127.0.0.1}"
BLUE_PORT="${BLUE_PORT:-8080}"
GREEN_PORT="${GREEN_PORT:-8081}"

CURRENT_COLOR="green"
if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  CURRENT_COLOR="${CURRENT_COLOR:-${DEPLOYMENT_COLOR:-green}}"
fi

case "${CURRENT_COLOR,,}" in
  blue)
    TARGET_COLOR="green"
    APP_TARGET_PORT="$GREEN_PORT"
    CONTAINER_NAME="app-green"
    ;;
  green)
    TARGET_COLOR="blue"
    APP_TARGET_PORT="$BLUE_PORT"
    CONTAINER_NAME="app-blue"
    ;;
  *)
    echo "Error: invalid current color in ${STATE_FILE}: ${CURRENT_COLOR}" >&2
    exit 1
    ;;
esac

export APP_TARGET_IP
export APP_TARGET_PORT
export DEPLOYMENT_COLOR="$TARGET_COLOR"

if ! command -v envsubst >/dev/null 2>&1; then
  echo "Error: envsubst is not installed. Install gettext-base first." >&2
  exit 1
fi

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "Error: Nginx template not found: ${TEMPLATE_PATH}" >&2
  exit 1
fi

docker pull "$IMAGE"
docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${APP_TARGET_PORT}:3000" \
  --restart unless-stopped \
  "$IMAGE"

for attempt in $(seq 1 30); do
  if curl -fsS "http://${APP_TARGET_IP}:${APP_TARGET_PORT}/health" >/dev/null; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "Error: ${TARGET_COLOR} deployment did not become healthy." >&2
    docker logs "$CONTAINER_NAME" || true
    exit 1
  fi

  sleep 2
done

TEMP_CONFIG="$(mktemp)"
cleanup() {
  rm -f "$TEMP_CONFIG"
}
trap cleanup EXIT

envsubst '${APP_TARGET_IP} ${APP_TARGET_PORT} ${DEPLOYMENT_COLOR}' < "$TEMPLATE_PATH" > "$TEMP_CONFIG"

# Replace a previous real file or symlink so the pipeline owns the generated config.
rm -f "$NGINX_CONFIG_PATH"
install -m 0644 "$TEMP_CONFIG" "$NGINX_CONFIG_PATH"

if nginx -t; then
  systemctl reload nginx
else
  echo "Error: Nginx configuration test failed. Service was not reloaded." >&2
  exit 1
fi

mkdir -p "$(dirname "$STATE_FILE")"
cat > "$STATE_FILE" <<EOF
CURRENT_COLOR=${TARGET_COLOR}
APP_TARGET_IP=${APP_TARGET_IP}
APP_TARGET_PORT=${APP_TARGET_PORT}
DEPLOYMENT_COLOR=${TARGET_COLOR}
IMAGE=${IMAGE}
UPDATED_AT=$(date -Is)
EOF

echo "Blue-Green deploy complete: ${CURRENT_COLOR} -> ${TARGET_COLOR} (${APP_TARGET_IP}:${APP_TARGET_PORT})"
