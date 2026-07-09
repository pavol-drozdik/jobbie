#!/usr/bin/env bash
# Autoscale Nest backend replicas on this VPS using host CPU, RAM, and /health latency.
# Requires REDIS_URL in .env.backend when scale > 1. Install via jobbie-backend-autoscale.timer.
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/nestjs-typesense}"
ENV_FILE="${DEPLOY_ROOT}/.env"
BACKEND_ENV_FILE="${DEPLOY_ROOT}/.env.backend"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-nestjs-typesense}"
STATE_DIR="${JOBBIE_AUTOSCALE_STATE_DIR:-/var/lib/jobbie}"
STATE_FILE="${STATE_DIR}/autoscale-backend.state"
LOG_FILE="${STATE_DIR}/autoscale-backend.log"
DEPLOY_LOCK="${JOBBIE_DEPLOY_LOCK:-/var/lib/jobbie/backend-deploy.lock}"
SCALE_SCRIPT="${DEPLOY_ROOT}/scripts/scale_backend.sh"

# Resource model — max replicas derived from VPS size (override via .env if needed).
AUTOSCALE_RESERVE_RAM_MB="${AUTOSCALE_RESERVE_RAM_MB:-2800}"
AUTOSCALE_PER_REPLICA_RAM_MB="${AUTOSCALE_PER_REPLICA_RAM_MB:-1024}"
AUTOSCALE_RESERVE_CPU="${AUTOSCALE_RESERVE_CPU:-1.5}"
AUTOSCALE_ABSOLUTE_MAX="${AUTOSCALE_ABSOLUTE_MAX:-8}"

# Decision thresholds
AUTOSCALE_UP_CPU_PCT="${AUTOSCALE_UP_CPU_PCT:-70}"
AUTOSCALE_DOWN_CPU_PCT="${AUTOSCALE_DOWN_CPU_PCT:-35}"
AUTOSCALE_UP_LATENCY_MS="${AUTOSCALE_UP_LATENCY_MS:-800}"
AUTOSCALE_DOWN_LATENCY_MS="${AUTOSCALE_DOWN_LATENCY_MS:-250}"
AUTOSCALE_UP_MEM_MAX_PCT="${AUTOSCALE_UP_MEM_MAX_PCT:-78}"
AUTOSCALE_MIN_FREE_RAM_MB="${AUTOSCALE_MIN_FREE_RAM_MB:-1024}"
AUTOSCALE_TYPESENSE_CPU_BLOCK_PCT="${AUTOSCALE_TYPESENSE_CPU_BLOCK_PCT:-65}"
AUTOSCALE_COOLDOWN_SEC="${AUTOSCALE_COOLDOWN_SEC:-900}"

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

log() {
  local line
  line="$(date -u +"%Y-%m-%dT%H:%M:%SZ") $*"
  mkdir -p "${STATE_DIR}"
  echo "${line}" | tee -a "${LOG_FILE}"
}

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

load_deploy_env() {
  [[ -f "${ENV_FILE}" ]] || return 0
  local key val
  for key in \
    BACKEND_AUTOSCALE_ENABLED \
    AUTOSCALE_RESERVE_RAM_MB \
    AUTOSCALE_PER_REPLICA_RAM_MB \
    AUTOSCALE_RESERVE_CPU \
    AUTOSCALE_ABSOLUTE_MAX \
    AUTOSCALE_UP_CPU_PCT \
    AUTOSCALE_DOWN_CPU_PCT \
    AUTOSCALE_UP_LATENCY_MS \
    AUTOSCALE_DOWN_LATENCY_MS \
    AUTOSCALE_UP_MEM_MAX_PCT \
    AUTOSCALE_MIN_FREE_RAM_MB \
    AUTOSCALE_TYPESENSE_CPU_BLOCK_PCT \
    AUTOSCALE_COOLDOWN_SEC; do
    val="$(read_env_value "${key}" "${ENV_FILE}")"
    if [[ -n "${val}" ]]; then
      printf -v "${key}" '%s' "${val}"
    fi
  done
}

read_host_metrics() {
  cpu_count="$(nproc 2>/dev/null || echo 1)"
  read -r load_1 _ _ _ < /proc/loadavg 2>/dev/null || load_1=0

  mem_total_kb=0
  mem_available_kb=0
  if [[ -r /proc/meminfo ]]; then
    mem_total_kb="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
    mem_available_kb="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  fi
  mem_total_mb=$(( mem_total_kb / 1024 ))
  mem_available_mb=$(( mem_available_kb / 1024 ))
  mem_used_mb=$(( mem_total_mb - mem_available_mb ))

  load_pct="$(awk -v l="${load_1}" -v c="${cpu_count}" 'BEGIN {
    if (c <= 0) { print "0"; exit }
    p = 100 * l / c
    if (p < 0) p = 0
    if (p > 100) p = 100
    printf "%.0f", p
  }')"

  mem_pct="$(awk -v a="${mem_available_mb}" -v t="${mem_total_mb}" 'BEGIN {
    if (t <= 0) { print "0"; exit }
    used = t - a
    p = 100 * used / t
    if (p < 0) p = 0
    if (p > 100) p = 100
    printf "%.0f", p
  }')"
}

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  else
    sudo -n docker "$@"
  fi
}

container_cpu_pct() {
  local pattern="$1"
  docker_cmd stats --no-stream --format '{{.Name}} {{.CPUPerc}}' 2>/dev/null \
    | grep -E "${pattern}" \
    | awk '{gsub(/%/,"",$2); if ($2+0 > m) m=$2+0} END {printf "%.0f", m+0}'
}

probe_latency_ms() {
  local app_domain="$1"
  local samples=() i ms
  if [[ -z "${app_domain}" ]]; then
    echo "0"
    return
  fi
  for i in 1 2 3; do
    ms="$(curl -fsS -o /dev/null -w '%{time_total}' \
      -H "Host: ${app_domain}" \
      --connect-timeout 2 \
      --max-time 6 \
      "http://127.0.0.1/health" 2>/dev/null | awk '{printf "%d", $1 * 1000}' || echo "0")"
    samples+=("${ms}")
    sleep 0.2
  done
  printf '%s\n' "${samples[@]}" | sort -n | awk 'NR==2 {print $1}'
}

compute_max_replicas() {
  local max_by_ram max_by_cpu max_replicas
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
  echo "${max_replicas}"
}

get_current_scale() {
  local from_env running
  from_env="$(read_env_value BACKEND_SCALE "${ENV_FILE}")"
  from_env="${from_env:-1}"
  running="$(docker_cmd compose -f "${DEPLOY_ROOT}/docker-compose.yml" -p "${COMPOSE_PROJECT}" \
    ps backend --status running -q 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "${running}" =~ ^[0-9]+$ ]] && [[ "${running}" -gt 0 ]]; then
    echo "${running}"
  else
    echo "${from_env}"
  fi
}

cooldown_active() {
  local last_at now elapsed
  [[ -f "${STATE_FILE}" ]] || return 1
  last_at="$(grep -E '^last_scale_at=' "${STATE_FILE}" 2>/dev/null | cut -d= -f2- || true)"
  [[ -n "${last_at}" ]] || return 1
  now="$(date +%s)"
  elapsed=$(( now - last_at ))
  [[ "${elapsed}" -lt "${AUTOSCALE_COOLDOWN_SEC}" ]]
}

write_state() {
  local from="$1" to="$2" reason="$3"
  mkdir -p "${STATE_DIR}"
  cat > "${STATE_FILE}" <<EOF
last_scale_at=$(date +%s)
last_scale_from=${from}
last_scale_to=${to}
last_reason=${reason}
EOF
}

main() {
  load_deploy_env

  if [[ "${BACKEND_AUTOSCALE_ENABLED:-0}" != "1" ]]; then
    log "autoscale disabled (set BACKEND_AUTOSCALE_ENABLED=1 in ${ENV_FILE})"
    exit 0
  fi

  if [[ ! -f "${ENV_FILE}" ]]; then
    log "missing ${ENV_FILE}"
    exit 1
  fi

  if [[ -f "${DEPLOY_LOCK}" ]]; then
    log "deploy lock present; skipping"
    exit 0
  fi

  read_host_metrics
  app_domain="$(read_env_value APP_DOMAIN "${ENV_FILE}")"
  latency_ms="$(probe_latency_ms "${app_domain}")"
  typesense_cpu="$(container_cpu_pct 'typesense')"
  backend_cpu="$(container_cpu_pct 'backend')"
  current_scale="$(get_current_scale)"
  max_replicas="$(compute_max_replicas)"
  min_replicas=1
  target_scale="${current_scale}"
  reason="noop"

  log "metrics load_pct=${load_pct} mem_pct=${mem_pct} mem_avail_mb=${mem_available_mb} latency_ms=${latency_ms} backend_cpu=${backend_cpu:-0} typesense_cpu=${typesense_cpu:-0} scale=${current_scale} max=${max_replicas}"

  if cooldown_active; then
    log "cooldown active (${AUTOSCALE_COOLDOWN_SEC}s); holding scale=${current_scale}"
    exit 0
  fi

  scale_up=0
  scale_down=0
  block_scale_up=0

  if [[ "${load_pct}" -ge "${AUTOSCALE_UP_CPU_PCT}" ]]; then
    scale_up=1
  fi
  if [[ "${latency_ms}" -ge "${AUTOSCALE_UP_LATENCY_MS}" ]]; then
    scale_up=1
  fi
  if [[ "${mem_pct}" -gt "${AUTOSCALE_UP_MEM_MAX_PCT}" ]]; then
    block_scale_up=1
  fi
  if [[ "${mem_available_mb}" -lt "${AUTOSCALE_MIN_FREE_RAM_MB}" ]]; then
    block_scale_up=1
  fi
  if [[ -n "${typesense_cpu}" && "${typesense_cpu}" -ge "${AUTOSCALE_TYPESENSE_CPU_BLOCK_PCT}" ]]; then
    block_scale_up=1
    log "typesense CPU ${typesense_cpu}% blocks scale-up"
  fi

  scale_down=0
  if [[ "${load_pct}" -le "${AUTOSCALE_DOWN_CPU_PCT}" && "${latency_ms}" -le "${AUTOSCALE_DOWN_LATENCY_MS}" ]]; then
    scale_down=1
  fi

  if [[ "${scale_up}" -eq 1 && "${block_scale_up}" -eq 0 && "${current_scale}" -lt "${max_replicas}" ]]; then
    target_scale=$(( current_scale + 1 ))
    reason="scale_up cpu=${load_pct} latency=${latency_ms}ms"
  elif [[ "${scale_down}" -eq 1 && "${current_scale}" -gt "${min_replicas}" ]]; then
    target_scale=$(( current_scale - 1 ))
    reason="scale_down cpu=${load_pct} latency=${latency_ms}ms"
  fi

  if [[ "${target_scale}" -gt "${max_replicas}" ]]; then
    target_scale="${max_replicas}"
    reason="capped_max_replicas=${max_replicas}"
  fi

  if [[ "${target_scale}" == "${current_scale}" ]]; then
    log "no change (scale=${current_scale}, max=${max_replicas}, reason=${reason})"
    exit 0
  fi

  log "decision ${current_scale} -> ${target_scale} (${reason})"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "dry-run: would scale to ${target_scale}"
    exit 0
  fi

  if [[ ! -x "${SCALE_SCRIPT}" ]]; then
    log "missing executable ${SCALE_SCRIPT}"
    exit 1
  fi

  if "${SCALE_SCRIPT}" "${target_scale}"; then
    write_state "${current_scale}" "${target_scale}" "${reason}"
    log "scaled OK to ${target_scale}"
  else
    log "scale failed"
    exit 1
  fi
}

main "$@"
