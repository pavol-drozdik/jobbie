#!/usr/bin/env bash
# Apply backend replica count on this VPS (no image pull — use deploy_backend.sh for releases).
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/nestjs-typesense}"
ENV_FILE="${DEPLOY_ROOT}/.env"
BACKEND_ENV_FILE="${DEPLOY_ROOT}/.env.backend"
DEPLOY_LOCK="${JOBBIE_DEPLOY_LOCK:-/var/lib/jobbie/backend-deploy.lock}"

trim_env() {
  local v="$1"
  v="${v//$'\r'/}"
  v="${v//$'\n'/}"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  printf '%s' "$v"
}

read_env_value() {
  local key="$1"
  local file="$2"
  local raw
  raw="$(grep -E "^${key}=" "${file}" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  trim_env "${raw}"
}

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  elif sudo -n docker info >/dev/null 2>&1; then
    sudo docker "$@"
  else
    echo "Cannot run docker." >&2
    return 1
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif sudo -n docker compose version >/dev/null 2>&1; then
    sudo -E docker compose "$@"
  else
    echo "Cannot run docker compose." >&2
    return 1
  fi
}

usage() {
  cat <<'EOF'
Usage: scale_backend.sh <replicas>

Updates BACKEND_SCALE in .env and runs docker compose up -d --scale backend=N.
Requires REDIS_URL in .env.backend when replicas > 1.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

TARGET_SCALE="${1:-}"
if ! [[ "${TARGET_SCALE}" =~ ^[0-9]+$ ]] || [[ "${TARGET_SCALE}" -lt 1 ]]; then
  echo "Replicas must be a positive integer (got: ${TARGET_SCALE:-empty})" >&2
  usage >&2
  exit 1
fi

if [[ -f "${DEPLOY_LOCK}" ]]; then
  echo "Deploy lock present (${DEPLOY_LOCK}); refusing to scale." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

if [[ "${TARGET_SCALE}" -gt 1 ]]; then
  redis_url=""
  if [[ -f "${BACKEND_ENV_FILE}" ]]; then
    redis_url="$(read_env_value REDIS_URL "${BACKEND_ENV_FILE}")"
  fi
  if [[ -z "${redis_url}" ]]; then
    echo "REDIS_URL must be set in ${BACKEND_ENV_FILE} before scaling above 1." >&2
    exit 1
  fi
fi

CURRENT_SCALE="$(read_env_value BACKEND_SCALE "${ENV_FILE}")"
CURRENT_SCALE="${CURRENT_SCALE:-1}"

if [[ "${CURRENT_SCALE}" == "${TARGET_SCALE}" ]]; then
  echo "Already at BACKEND_SCALE=${TARGET_SCALE}"
  exit 0
fi

if grep -q '^BACKEND_SCALE=' "${ENV_FILE}"; then
  sed -i "s|^BACKEND_SCALE=.*|BACKEND_SCALE=${TARGET_SCALE}|" "${ENV_FILE}"
else
  printf '\nBACKEND_SCALE=%s\n' "${TARGET_SCALE}" >> "${ENV_FILE}"
fi

cd "${DEPLOY_ROOT}"
echo "Scaling backend ${CURRENT_SCALE} -> ${TARGET_SCALE}..."
if ! compose_cmd up -d --scale "backend=${TARGET_SCALE}" --wait --wait-timeout 180 backend; then
  echo "docker compose scale failed; restoring BACKEND_SCALE=${CURRENT_SCALE}" >&2
  sed -i "s|^BACKEND_SCALE=.*|BACKEND_SCALE=${CURRENT_SCALE}|" "${ENV_FILE}"
  compose_cmd up -d --scale "backend=${CURRENT_SCALE}" backend || true
  exit 1
fi

APP_DOMAIN="$(read_env_value APP_DOMAIN "${ENV_FILE}")"
HEALTH_URL="${HEALTH_URL:-}"
if [[ -z "${HEALTH_URL}" && -n "${APP_DOMAIN}" ]]; then
  HEALTH_URL="https://${APP_DOMAIN}/health"
fi

if [[ -n "${HEALTH_URL}" ]]; then
  if [[ "${HEALTH_URL}" != */health ]]; then
    HEALTH_URL="${HEALTH_URL%/}/health"
  fi
  if [[ -n "${APP_DOMAIN}" ]] && curl -fsS -H "Host: ${APP_DOMAIN}" "http://127.0.0.1/health" >/dev/null 2>&1; then
    echo "Health OK (local Caddy)"
  elif curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "Health OK (${HEALTH_URL})"
  else
    echo "Warning: health check failed after scale; verify manually." >&2
    exit 1
  fi
fi

echo "Scale OK: BACKEND_SCALE=${TARGET_SCALE}"
