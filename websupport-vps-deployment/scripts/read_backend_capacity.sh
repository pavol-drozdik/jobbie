#!/usr/bin/env bash
# Print JSON capacity summary for Nest backend scaling (admin Infra panel).
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/nestjs-typesense}"
ENV_FILE="${DEPLOY_ROOT}/.env"
BACKEND_ENV_FILE="${DEPLOY_ROOT}/.env.backend"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-nestjs-typesense}"
DEPLOY_LOCK="${JOBBIE_DEPLOY_LOCK:-/var/lib/jobbie/backend-deploy.lock}"

AUTOSCALE_RESERVE_RAM_MB="${AUTOSCALE_RESERVE_RAM_MB:-2800}"
AUTOSCALE_PER_REPLICA_RAM_MB="${AUTOSCALE_PER_REPLICA_RAM_MB:-1024}"
AUTOSCALE_RESERVE_CPU="${AUTOSCALE_RESERVE_CPU:-1.5}"
AUTOSCALE_ABSOLUTE_MAX="${AUTOSCALE_ABSOLUTE_MAX:-8}"

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

if [[ -f "${ENV_FILE}" ]]; then
  for key in \
    AUTOSCALE_RESERVE_RAM_MB \
    AUTOSCALE_PER_REPLICA_RAM_MB \
    AUTOSCALE_RESERVE_CPU \
    AUTOSCALE_ABSOLUTE_MAX; do
    val="$(read_env_value "${key}" "${ENV_FILE}")"
    if [[ -n "${val}" ]]; then
      printf -v "${key}" '%s' "${val}"
    fi
  done
fi

cpu_count="$(nproc 2>/dev/null || echo 1)"
mem_total_kb=0
if [[ -r /proc/meminfo ]]; then
  mem_total_kb="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
fi
mem_total_mb=$(( mem_total_kb / 1024 ))

max_by_ram=$(( (mem_total_mb - AUTOSCALE_RESERVE_RAM_MB) / AUTOSCALE_PER_REPLICA_RAM_MB ))
max_by_cpu="$(awk -v c="${cpu_count}" -v r="${AUTOSCALE_RESERVE_CPU}" 'BEGIN {
  v = int(c - r)
  if (v < 1) v = 1
  print v
}')"

max_replicas="${max_by_ram}"
if [[ "${max_by_cpu}" -lt "${max_replicas}" ]]; then
  max_replicas="${max_by_cpu}"
fi
if [[ "${max_replicas}" -lt 1 ]]; then
  max_replicas=1
fi
if [[ "${max_replicas}" -gt "${AUTOSCALE_ABSOLUTE_MAX}" ]]; then
  max_replicas="${AUTOSCALE_ABSOLUTE_MAX}"
fi

current_scale="$(read_env_value BACKEND_SCALE "${ENV_FILE}")"
current_scale="${current_scale:-1}"

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  else
    sudo -n docker "$@"
  fi
}

running_scale="$(docker_cmd compose -f "${DEPLOY_ROOT}/docker-compose.yml" -p "${COMPOSE_PROJECT}" \
  ps backend --status running -q 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${running_scale}" =~ ^[0-9]+$ ]] && [[ "${running_scale}" -gt 0 ]]; then
  current_scale="${running_scale}"
fi

autoscale_enabled=0
if [[ "$(read_env_value BACKEND_AUTOSCALE_ENABLED "${ENV_FILE}")" == "1" ]]; then
  autoscale_enabled=1
fi

redis_configured=0
if [[ -f "${BACKEND_ENV_FILE}" ]]; then
  redis_url="$(read_env_value REDIS_URL "${BACKEND_ENV_FILE}")"
  if [[ -n "${redis_url}" ]]; then
    redis_configured=1
  fi
fi

deploy_lock=0
if [[ -f "${DEPLOY_LOCK}" ]]; then
  deploy_lock=1
fi

printf '{"current_scale":%s,"max_replicas":%s,"autoscale_enabled":%s,"redis_configured":%s,"deploy_lock":%s,"cpu_count":%s,"mem_total_mb":%s}\n' \
  "${current_scale}" \
  "${max_replicas}" \
  "${autoscale_enabled}" \
  "${redis_configured}" \
  "${deploy_lock}" \
  "${cpu_count}" \
  "${mem_total_mb}"
