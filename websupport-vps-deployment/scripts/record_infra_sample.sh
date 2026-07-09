#!/usr/bin/env bash
# Append one CPU/RAM sample for JOBBIE admin infra history (fast — no Docker, no sleep).
# Install via systemd timer jobbie-infra-metrics.timer on each VPS.
set -euo pipefail

OUTPUT="${JOBBIE_INFRA_METRICS_PATH:-/var/lib/jobbie/infra-metrics.jsonl}"
mkdir -p "$(dirname "$OUTPUT")"

cpu_count="$(nproc 2>/dev/null || echo 1)"
read -r load_1 load_5 load_15 _ < /proc/loadavg 2>/dev/null || load_1=0

mem_total=0
mem_available=0
if [[ -r /proc/meminfo ]]; then
  mem_total="$(awk '/^MemTotal:/ {print $2 * 1024}' /proc/meminfo)"
  mem_available="$(awk '/^MemAvailable:/ {print $2 * 1024}' /proc/meminfo)"
fi
mem_used=$(( mem_total - mem_available ))

load_pct="$(awk -v l="$load_1" -v c="$cpu_count" 'BEGIN {
  if (c <= 0) { print "0"; exit }
  p = 100 * l / c
  if (p < 0) p = 0
  if (p > 100) p = 100
  printf "%.1f", p
}')"

mem_pct="$(awk -v u="$mem_used" -v t="$mem_total" 'BEGIN {
  if (t <= 0) { print "0"; exit }
  p = 100 * u / t
  if (p < 0) p = 0
  if (p > 100) p = 100
  printf "%.1f", p
}')"

t="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

printf '{"t":"%s","load_1":%s,"load_pct":%s,"mem_pct":%s}\n' \
  "$t" "$load_1" "$load_pct" "$mem_pct" >> "$OUTPUT"

chmod 644 "$OUTPUT" 2>/dev/null || true
