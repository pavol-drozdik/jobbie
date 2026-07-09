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
DEPLOY_LOCK="${JOBBIE_DEPLOY_LOCK:-/var/lib/jobbie/backend-deploy.lock}"

mkdir -p "$(dirname "${DEPLOY_LOCK}")"
touch "${DEPLOY_LOCK}"
cleanup_deploy_lock() {
  rm -f "${DEPLOY_LOCK}"
}
trap cleanup_deploy_lock EXIT

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

# grep in a pipeline exits 1 when the key is missing; with pipefail that aborts set -e.
read_env_value() {
  local key="$1"
  local file="$2"
  local raw
  raw="$(grep -E "^${key}=" "${file}" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  trim_env "${raw}"
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
  APP_DOMAIN="$(read_env_value APP_DOMAIN "${ENV_FILE}")"
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
echo "Target image: ${NEW_IMAGE}"

OLD_BACKEND_IMAGE=""
if grep -q '^BACKEND_IMAGE=' "${ENV_FILE}"; then
  OLD_BACKEND_IMAGE="$(read_env_value BACKEND_IMAGE "${ENV_FILE}")"
fi

restore_backend_image() {
  if [[ -n "${OLD_BACKEND_IMAGE}" ]] && [[ "${OLD_BACKEND_IMAGE}" != "${NEW_IMAGE}" ]]; then
    sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${OLD_BACKEND_IMAGE}|" "${ENV_FILE}"
    echo "Restored BACKEND_IMAGE to ${OLD_BACKEND_IMAGE}" >&2
  fi
}
trap restore_backend_image ERR

if grep -q '^BACKEND_IMAGE=' "${ENV_FILE}"; then
  sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${NEW_IMAGE}|" "${ENV_FILE}"
else
  printf '\nBACKEND_IMAGE=%s\n' "${NEW_IMAGE}" >> "${ENV_FILE}"
fi

cd "${DEPLOY_ROOT}"
export BACKEND_IMAGE="${NEW_IMAGE}"

BACKEND_SCALE="${BACKEND_SCALE:-}"
if [[ -z "${BACKEND_SCALE}" ]] && [[ -f "${ENV_FILE}" ]]; then
  BACKEND_SCALE="$(read_env_value BACKEND_SCALE "${ENV_FILE}")"
fi
BACKEND_SCALE="${BACKEND_SCALE:-1}"
if ! [[ "${BACKEND_SCALE}" =~ ^[0-9]+$ ]] || [[ "${BACKEND_SCALE}" -lt 1 ]]; then
  echo "BACKEND_SCALE must be a positive integer (got: ${BACKEND_SCALE})" >&2
  exit 1
fi
echo "Backend replicas: ${BACKEND_SCALE}"

echo "Pulling backend image..."
if ! compose_cmd pull backend; then
  echo "Failed to pull ${NEW_IMAGE}." >&2
  echo "Verify the tag exists on GHCR and GHCR_TOKEN can read the package." >&2
  exit 1
fi

echo "Starting backend (scale=${BACKEND_SCALE}, wait up to 180s)..."
if ! compose_cmd up -d --scale "backend=${BACKEND_SCALE}" --wait --wait-timeout 180 backend; then
  echo "docker compose --wait failed (backend container unhealthy or timed out)." >&2
  compose_cmd ps backend || true
  compose_cmd logs backend --tail 120 || true
  exit 1
fi

# GET /health bypasses CORS (no Origin required) — safe for curl and load balancers.
# Prefer local Caddy (Host header) before the public URL — avoids false fails during DNS/CF flap.
APP_DOMAIN="$(read_env_value APP_DOMAIN "${ENV_FILE}")"
LOCAL_HEALTH_URL=""
if [[ -n "${APP_DOMAIN}" ]]; then
  LOCAL_HEALTH_URL="http://127.0.0.1/health"
fi

health_probe() {
  if [[ -n "${LOCAL_HEALTH_URL}" ]]; then
    if curl -fsS -H "Host: ${APP_DOMAIN}" "${LOCAL_HEALTH_URL}"; then
      return 0
    fi
  fi
  curl -fsS "${HEALTH_URL}"
}

HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP="${HEALTH_SLEEP:-3}"
attempt=1
while [[ "${attempt}" -le "${HEALTH_RETRIES}" ]]; do
  if health_probe; then
    echo
    trap - ERR
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
