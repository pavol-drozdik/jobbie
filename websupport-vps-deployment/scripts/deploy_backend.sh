#!/usr/bin/env bash
set -euo pipefail

# Pull a versioned backend image and restart the backend container.
# Shared by staging and production VPS deploy (GitHub Actions SSH or manual).
# Environment is selected by workflow secrets/vars and each host's .env — not by this script.
#
#   sudo BACKEND_VERSION=2026.06.12-abc1234 GHCR_IMAGE=ghcr.io/owner/jobbie-backend \
#     GHCR_USER=owner GHCR_TOKEN=... \
#     bash scripts/deploy_backend.sh
# HEALTH_URL is optional when APP_DOMAIN is set in ${DEPLOY_ROOT}/.env.

DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/nestjs-typesense}"
BACKEND_VERSION="${BACKEND_VERSION:?BACKEND_VERSION is required}"
GHCR_IMAGE="${GHCR_IMAGE:?GHCR_IMAGE is required}"

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  elif sudo -n docker info >/dev/null 2>&1; then
    sudo docker "$@"
  else
    echo "Cannot run docker (add user to docker group or configure passwordless sudo for docker)."
    exit 1
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif sudo -n docker compose version >/dev/null 2>&1; then
    sudo -E docker compose "$@"
  else
    echo "Cannot run docker compose."
    exit 1
  fi
}

# GitHub Actions vars and hand-edited .env values often include trailing CR/LF.
trim_env() {
  local v="$1"
  v="${v//$'\r'/}"
  v="${v//$'\n'/}"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  printf '%s' "$v"
}

if [[ -n "${HEALTH_URL:-}" ]]; then
  HEALTH_URL="$(trim_env "${HEALTH_URL}")"
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  if [[ -z "${GHCR_USER:-}" ]]; then
    echo "GHCR_USER is required when GHCR_TOKEN is set (private GHCR package)."
    exit 1
  fi
  printf '%s' "${GHCR_TOKEN}" | docker_cmd login ghcr.io -u "${GHCR_USER}" --password-stdin
fi

ENV_FILE="${DEPLOY_ROOT}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE} — create from .env.example first."
  exit 1
fi

if [[ -z "${HEALTH_URL:-}" ]]; then
  APP_DOMAIN="$(grep -E '^APP_DOMAIN=' "${ENV_FILE}" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)"
  APP_DOMAIN="$(trim_env "${APP_DOMAIN}")"
  if [[ -n "${APP_DOMAIN}" ]]; then
    HEALTH_URL="https://${APP_DOMAIN}/health"
  fi
fi
if [[ -z "${HEALTH_URL:-}" ]]; then
  echo "HEALTH_URL is required (set env var or APP_DOMAIN in ${ENV_FILE})." >&2
  exit 1
fi
if [[ "${HEALTH_URL}" != */health ]]; then
  HEALTH_URL="${HEALTH_URL%/}/health"
fi
echo "Health check URL: ${HEALTH_URL}"

NEW_IMAGE="${GHCR_IMAGE}:${BACKEND_VERSION}"
if grep -q '^BACKEND_IMAGE=' "${ENV_FILE}"; then
  sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${NEW_IMAGE}|" "${ENV_FILE}"
else
  printf '\nBACKEND_IMAGE=%s\n' "${NEW_IMAGE}" >> "${ENV_FILE}"
fi

cd "${DEPLOY_ROOT}"
export BACKEND_IMAGE="${NEW_IMAGE}"
compose_cmd pull backend
compose_cmd up -d --wait --wait-timeout 180 backend

# GET /health bypasses CORS (no Origin required) — safe for curl and load balancers.
# Retry through Caddy in case the reverse proxy flaps briefly after container recreate.
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP="${HEALTH_SLEEP:-3}"
attempt=1
while [[ "${attempt}" -le "${HEALTH_RETRIES}" ]]; do
  if curl -fsS "${HEALTH_URL}"; then
    echo
    echo "Deploy OK: ${NEW_IMAGE}"
    exit 0
  fi
  if [[ "${attempt}" -eq "${HEALTH_RETRIES}" ]]; then
    echo "Health check failed after ${HEALTH_RETRIES} attempts: ${HEALTH_URL}" >&2
    compose_cmd ps backend || true
    compose_cmd logs backend --tail 80 || true
    exit 1
  fi
  echo "Health check attempt ${attempt}/${HEALTH_RETRIES} failed; retrying in ${HEALTH_SLEEP}s..."
  sleep "${HEALTH_SLEEP}"
  attempt=$((attempt + 1))
done
