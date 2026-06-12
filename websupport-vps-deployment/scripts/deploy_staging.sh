#!/usr/bin/env bash
set -euo pipefail

# Deploy backend image on staging VPS. Called from GitHub Actions (SSH) or manually:
#   sudo BACKEND_VERSION=2026.06.12-1 GHCR_IMAGE=ghcr.io/owner/jobbie-backend \
#     GHCR_USER=owner GHCR_TOKEN=... bash scripts/deploy_staging.sh

DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/nestjs-typesense}"
BACKEND_VERSION="${BACKEND_VERSION:?BACKEND_VERSION is required}"
GHCR_IMAGE="${GHCR_IMAGE:?GHCR_IMAGE is required}"
HEALTH_URL="${HEALTH_URL:-https://api.cocreate.cz/health}"

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

NEW_IMAGE="${GHCR_IMAGE}:${BACKEND_VERSION}"
if grep -q '^BACKEND_IMAGE=' "${ENV_FILE}"; then
  sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${NEW_IMAGE}|" "${ENV_FILE}"
else
  printf '\nBACKEND_IMAGE=%s\n' "${NEW_IMAGE}" >> "${ENV_FILE}"
fi

cd "${DEPLOY_ROOT}"
export BACKEND_IMAGE="${NEW_IMAGE}"
compose_cmd pull backend
compose_cmd up -d backend

curl -fsS "${HEALTH_URL}"
echo
echo "Staging deploy OK: ${NEW_IMAGE}"
