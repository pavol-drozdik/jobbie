#!/usr/bin/env bash
# Restart a single Nest backend replica container (admin allowlisted SSH op).
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/nestjs-typesense}"
DEPLOY_LOCK="${JOBBIE_DEPLOY_LOCK:-/var/lib/jobbie/backend-deploy.lock}"
CONTAINER_NAME="${1:-}"

if [[ -z "${CONTAINER_NAME}" ]]; then
  echo "Usage: restart_backend_instance.sh <container_name>" >&2
  exit 1
fi

if [[ ! "${CONTAINER_NAME}" =~ ^[-a-z0-9_.]+backend-[0-9]+$ ]]; then
  echo "Invalid container name: ${CONTAINER_NAME}" >&2
  exit 1
fi

if [[ -f "${DEPLOY_LOCK}" ]]; then
  echo "Deploy lock present (${DEPLOY_LOCK}); refusing restart." >&2
  exit 1
fi

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

if ! docker_cmd ps --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "Container not running: ${CONTAINER_NAME}" >&2
  exit 1
fi

echo "Restarting ${CONTAINER_NAME}..."
docker_cmd restart "${CONTAINER_NAME}"
echo "Restart OK: ${CONTAINER_NAME}"
