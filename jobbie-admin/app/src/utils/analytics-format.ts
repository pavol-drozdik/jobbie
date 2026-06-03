export type AnalyticsPreset = '7d' | '30d' | '90d' | 'custom'

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000

export function fmtMoneyCents(cents: number | null | undefined): string {
  const n = typeof cents === 'number' ? cents : Number(cents)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 100).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function fmtPct(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  const v = rate <= 1 ? rate * 100 : rate
  return `${v.toFixed(1)} %`
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('sk-SK')
}

export function formatDateRange(fromIso: string, toIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  const from = new Date(fromIso).toLocaleDateString('sk-SK', opts)
  const to = new Date(toIso).toLocaleDateString('sk-SK', opts)
  return `${from} – ${to}`
}

/** YYYY-MM-DD in local calendar for date inputs */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Prior period of equal length immediately before [from, to]. */
export function priorPeriodRange(fromIso: string, toIso: string): { from: string; to: string } {
  const fromMs = new Date(fromIso).getTime()
  const toMs = new Date(toIso).getTime()
  const span = Math.max(1, toMs - fromMs)
  return {
    from: new Date(fromMs - span).toISOString(),
    to: new Date(fromMs).toISOString(),
  }
}

export function pctChange(current: number, prior: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return null
  if (prior === 0) return current > 0 ? 100 : null
  return ((current - prior) / prior) * 100
}

export function presetToRange(
  preset: Exclude<AnalyticsPreset, 'custom'>,
): { from: string; to: string } {
  const to = new Date()
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const from = new Date(to.getTime() - days * 86400000)
  return { from: from.toISOString(), to: to.toISOString() }
}

function parseDateInputLocal(dateStr: string, endOfDay: boolean): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return new Date(NaN)
  if (endOfDay) {
    return new Date(y, m - 1, d, 23, 59, 59, 999)
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export type AnalyticsRangeResult =
  | { ok: true; from: string; to: string; daysInRange: number }
  | { ok: false; error: string }

export function resolveAnalyticsRange(
  preset: AnalyticsPreset,
  customFrom?: string,
  customTo?: string,
): AnalyticsRangeResult {
  if (preset !== 'custom') {
    const r = presetToRange(preset)
    const fromMs = new Date(r.from).getTime()
    const toMs = new Date(r.to).getTime()
    const daysInRange = Math.max(1, Math.ceil((toMs - fromMs) / 86400000))
    return { ok: true, from: r.from, to: r.to, daysInRange }
  }

  if (!customFrom?.trim() || !customTo?.trim()) {
    return { ok: false, error: 'Vyberte dátum Od a Do.' }
  }

  const fromDate = parseDateInputLocal(customFrom.trim(), false)
  const toDate = parseDateInputLocal(customTo.trim(), true)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { ok: false, error: 'Neplatný dátum.' }
  }

  const now = new Date()
  const toCapped = toDate.getTime() > now.getTime() ? now : toDate

  if (fromDate.getTime() > toCapped.getTime()) {
    return { ok: false, error: 'Dátum Od musí byť pred dátumom Do.' }
  }

  const spanMs = toCapped.getTime() - fromDate.getTime()
  if (spanMs > MAX_RANGE_MS) {
    return { ok: false, error: 'Obdobie môže byť najviac 366 dní.' }
  }

  const daysInRange = Math.max(1, Math.ceil(spanMs / 86400000))
  return {
    ok: true,
    from: fromDate.toISOString(),
    to: toCapped.toISOString(),
    daysInRange,
  }
}

export function defaultCustomFromTo(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime() - 30 * 86400000)
  return { from: toDateInputValue(from), to: toDateInputValue(to) }
}
