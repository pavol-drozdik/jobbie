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

printf '{"hostname":"%s","uptime_seconds":%s,"cpu_count":%s,"load_1":%s,"load_5":%s,"load_15":%s,"memory_total_bytes":%s,"memory_available_bytes":%s,"memory_used_bytes":%s,"disk_root":%s,"disk_typesense":%s,"containers":%s,"compose_ps":%s}\n' \
  "$hostname" \
  "$uptime_seconds" \
  "$cpu_count" \
  "${load_1:-0}" \
  "${load_5:-0}" \
  "${load_15:-0}" \
  "$mem_total" \
  "$mem_available" \
  "$mem_used" \
  "$disk_root" \
  "$disk_typesense" \
  "$containers" \
  "$compose_ps"
