export const CV_START_TERM_IMMEDIATE = 'Ihneď'
export const CV_START_TERM_AGREEMENT = 'Dohodou'
/** Stored when user picks Dátum before choosing a calendar day (not shown to employers as final value). */
export const CV_START_TERM_DATE_PENDING = 'Dátum'

export type CvStartTermMode = 'immediate' | 'agreement' | 'date'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseCvStartAvailability(raw: string | null | undefined): {
  mode: CvStartTermMode
  dateIso: string
} {
  const s = (raw ?? '').trim()
  if (!s || s === CV_START_TERM_IMMEDIATE) {
    return { mode: 'immediate', dateIso: '' }
  }
  if (s === CV_START_TERM_AGREEMENT || s.toLowerCase() === 'dohodou') {
    return { mode: 'agreement', dateIso: '' }
  }
  if (s === CV_START_TERM_DATE_PENDING) {
    return { mode: 'date', dateIso: '' }
  }
  if (ISO_DATE_RE.test(s)) {
    return { mode: 'date', dateIso: s }
  }
  const parsed = Date.parse(s)
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed)
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    if (ISO_DATE_RE.test(iso)) {
      return { mode: 'date', dateIso: iso }
    }
  }
  return { mode: 'immediate', dateIso: '' }
}

export function formatCvStartAvailabilityLabel(raw: string | null | undefined): string {
  const { mode, dateIso } = parseCvStartAvailability(raw)
  if (mode === 'immediate') return CV_START_TERM_IMMEDIATE
  if (mode === 'agreement') return CV_START_TERM_AGREEMENT
  if (dateIso) {
    const [y, m, d] = dateIso.split('-').map(Number)
    if (y && m && d) {
      return new Date(y, m - 1, d).toLocaleDateString('sk-SK')
    }
  }
  return 'Dátum'
}
