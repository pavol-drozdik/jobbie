#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pkill -f 'jobbie-admin.*electron' 2>/dev/null || true
pkill -f 'JOBBIE Admin' 2>/dev/null || true

remove_with_retry() {
  local dir="$1"
  local attempts="${2:-8}"
  local delay="${3:-0.4}"
  [[ ! -e "$dir" ]] && return 0
  for ((i=1; i<=attempts; i++)); do
    if rm -rf "$dir" 2>/dev/null; then
      [[ ! -e "$dir" ]] && echo "Removed $dir" && return 0
    fi
    echo "Attempt $i/$attempts: could not remove $dir"
    sleep "$delay"
  done
  [[ ! -e "$dir" ]]
}

any_failed=0
for d in "$ROOT/release" "$ROOT/release-fresh" "$ROOT"/release-build-*; do
  [[ -e "$d" ]] || continue
  if ! remove_with_retry "$d"; then
    echo "WARN: Still locked (optional): $d" >&2
    any_failed=1
  fi
done

if [[ "$any_failed" -eq 1 ]]; then
  echo "clean:release finished with warnings; builds use a fresh output directory on Windows." >&2
fi
exit 0
