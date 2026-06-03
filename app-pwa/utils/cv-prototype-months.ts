/** Slovak month names for CV prototype selects (aligned with design). */
export const CV_PROTOTYPE_MONTH_OPTIONS = [
  'Mesiac',
  'Január',
  'Február',
  'Marec',
  'Apríl',
  'Máj',
  'Jún',
  'Júl',
  'August',
  'September',
  'Október',
  'November',
  'December',
] as const

export function monthNumberFromSkLabel(label: string | null | undefined): number | null {
  const t = String(label || '').trim()
  if (!t || t === 'Mesiac') return null
  const i = CV_PROTOTYPE_MONTH_OPTIONS.indexOf(t as (typeof CV_PROTOTYPE_MONTH_OPTIONS)[number])
  if (i <= 0) return null
  return i
}

export function skMonthLabelFromNumber(month: number | null | undefined): string {
  if (month == null || month < 1 || month > 12) return 'Mesiac'
  return CV_PROTOTYPE_MONTH_OPTIONS[month] ?? 'Mesiac'
}

/** When the user picked a year but left month as „Mesiac“, default month so ISO dates persist on save. */
export function monthYearFromYearAndSkLabel(
  yearStr: string,
  monthLabel: string,
  defaultMonthWhenMissing: number,
): { month: number | null; year: number | null } {
  const trimmed = yearStr.trim()
  if (!trimmed) return { year: null, month: null }
  const year = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(year) || year <= 0) return { year: null, month: null }
  const month = monthNumberFromSkLabel(monthLabel)
  return { year, month: month ?? defaultMonthWhenMissing }
}
