#!/usr/bin/env bash
# Read-only host + Docker metrics for JOBBIE admin infrastructure dashboard.
# Prints a single JSON object to stdout. Safe to run via SSH.
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/srv/nestjs-typesense}"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-nestjs-typesense}"
TYPESENSE_DATA="${TYPESENSE_DATA:-${COMPOSE_DIR}/data/typesense}"

hostname="$(hostname -s 2>/dev/null || hostname)"
uptime_seconds="$(awk '{print int($1)}' /proc/uptime)"
cpu_count="$(nproc 2>/dev/null || echo 1)"
read -r load_1 load_5 load_15 _ < /proc/loadavg || true

cpu_per_core='null'
if [[ -r /proc/stat ]]; then
  _cpu_json='['
  _cpu_first=1
  mapfile -t _cpu_snap1 < <(awk '/^cpu[0-9]+/ {
    total = $2 + $3 + $4 + $5 + $6 + $7 + $8 + $9
    idle = $5 + $6
    print total, idle
  }' /proc/stat)
  sleep 1
  mapfile -t _cpu_snap2 < <(awk '/^cpu[0-9]+/ {
    total = $2 + $3 + $4 + $5 + $6 + $7 + $8 + $9
    idle = $5 + $6
    print total, idle
  }' /proc/stat)
  for ((_i=0; _i<${#_cpu_snap1[@]}; _i++)); do
    read -r _t1 _i1 <<< "${_cpu_snap1[_i]}"
    read -r _t2 _i2 <<< "${_cpu_snap2[_i]}"
    _pct=$(awk -v t1="$_t1" -v i1="$_i1" -v t2="$_t2" -v i2="$_i2" 'BEGIN {
      dt = t2 - t1
      di = i2 - i1
      if (dt <= 0) { print "0"; exit }
      pct = 100 * (1 - di / dt)
      if (pct < 0) pct = 0
      if (pct > 100) pct = 100
      printf "%.1f", pct
    }')
    if [[ $_cpu_first -eq 1 ]]; then
      _cpu_first=0
    else
      _cpu_json+=','
    fi
    _cpu_json+="$_pct"
  done
  _cpu_json+=']'
  cpu_per_core="$_cpu_json"
fi

mem_total=0
mem_available=0
if [[ -r /proc/meminfo ]]; then
  mem_total="$(awk '/^MemTotal:/ {print $2 * 1024}' /proc/meminfo)"
  mem_available="$(awk '/^MemAvailable:/ {print $2 * 1024}' /proc/meminfo)"
fi
mem_used=$(( mem_total - mem_available ))

disk_root='null'
if df_out="$(df -B1 / 2>/dev/null | tail -1)"; then
  read -r _ total used avail _ <<< "$df_out"
  pct=0
  if [[ "$total" -gt 0 ]]; then
    pct=$(( used * 100 / total ))
  fi
  disk_root=$(printf '{"mount":"/","total_bytes":%s,"used_bytes":%s,"available_bytes":%s,"used_percent":%s}' \
    "$total" "$used" "$avail" "$pct")
fi

disk_typesense='null'
if [[ -d "$TYPESENSE_DATA" ]]; then
  if df_out="$(df -B1 "$TYPESENSE_DATA" 2>/dev/null | tail -1)"; then
    read -r _ total used avail _ <<< "$df_out"
    pct=0
    if [[ "$total" -gt 0 ]]; then
      pct=$(( used * 100 / total ))
    fi
    disk_typesense=$(printf '{"mount":"%s","total_bytes":%s,"used_bytes":%s,"available_bytes":%s,"used_percent":%s}' \
      "$TYPESENSE_DATA" "$total" "$used" "$avail" "$pct")
  fi
fi

containers='[]'
if command -v docker >/dev/null 2>&1; then
  ids="$(docker ps -q --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" 2>/dev/null || true)"
  if [[ -n "$ids" ]]; then
    containers='['
    first=1
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      if [[ "$first" -eq 1 ]]; then
        first=0
      else
        containers+=','
      fi
      containers+="$line"
    done < <(docker stats --no-stream --format '{{json .}}' $ids 2>/dev/null || true)
    containers+=']'
  fi
fi

compose_ps='[]'
if [[ -f "$COMPOSE_FILE" ]] && command -v docker >/dev/null 2>&1; then
  ps_lines='['
  first=1
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if [[ "$first" -eq 1 ]]; then
      first=0
    else
      ps_lines+=','
    fi
    ps_lines+="$line"
  done < <(docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" ps --format json 2>/dev/null || true)
  ps_lines+=']'
  compose_ps="$ps_lines"
fi

printf '{"hostname":"%s","uptime_seconds":%s,"cpu_count":%s,"load_1":%s,"load_5":%s,"load_15":%s,"cpu_per_core":%s,"memory_total_bytes":%s,"memory_available_bytes":%s,"memory_used_bytes":%s,"disk_root":%s,"disk_typesense":%s,"containers":%s,"compose_ps":%s}\n' \
  "$hostname" \
  "$uptime_seconds" \
  "$cpu_count" \
  "${load_1:-0}" \
  "${load_5:-0}" \
  "${load_15:-0}" \
  "${cpu_per_core:-null}" \
  "$mem_total" \
  "$mem_available" \
  "$mem_used" \
  "$disk_root" \
  "$disk_typesense" \
  "$containers" \
  "$compose_ps"
