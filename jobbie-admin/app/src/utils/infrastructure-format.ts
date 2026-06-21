export function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function fmtUptime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function fmtLoad(load: number, cpuCount: number): string {
  if (!Number.isFinite(load)) return '—'
  const pct = cpuCount > 0 ? (load / cpuCount) * 100 : 0
  return `${load.toFixed(2)} (${pct.toFixed(0)}%)`
}

export function memPercent(used: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

export function barClass(percent: number): string {
  if (percent >= 90) return 'infra-bar__fill infra-bar__fill--danger'
  if (percent >= 75) return 'infra-bar__fill infra-bar__fill--warn'
  return 'infra-bar__fill'
}
