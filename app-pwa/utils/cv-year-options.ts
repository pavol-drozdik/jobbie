/** Years loaded per scroll chunk in CV year combobox. */
export const CV_YEAR_CHUNK_SIZE = 50

/** Earliest year allowed in CV period fields. */
export const CV_YEAR_ABSOLUTE_MIN = 1900

export const CV_EDU_END_ONGOING = 'Neukončené'

/** @deprecated Prefer dynamic combobox; kept for tests/legacy callers. */
export const CV_YEAR_LOOKBACK = 80

export type CvYearDropdownOption = { readonly value: string; readonly label: string }

/** Calendar year for CV pickers (updates automatically each January). */
export function getCvCalendarYear(): number {
  return new Date().getFullYear()
}

/** Newest selectable calendar year (same as today’s year; never hardcoded). */
export function getCvCalendarYearMax(): number {
  return getCvCalendarYear()
}

export function cvYearToOption(year: number): CvYearDropdownOption {
  const s = String(year)
  return { value: s, label: s }
}

/** Descending years inclusive (newest first). */
export function buildCvYearRangeDescending(fromYear: number, toYear: number): CvYearDropdownOption[] {
  const hi = Math.max(fromYear, toYear)
  const lo = Math.min(fromYear, toYear)
  const out: CvYearDropdownOption[] = []
  for (let y = hi; y >= lo; y -= 1) {
    out.push(cvYearToOption(y))
  }
  return out
}

export function isValidCvYearNumber(year: number): boolean {
  return (
    Number.isFinite(year) &&
    year >= CV_YEAR_ABSOLUTE_MIN &&
    year <= getCvCalendarYearMax()
  )
}

export function normalizeCvYearCommit(
  raw: string,
  opts?: { includeOngoing?: boolean },
): string | null {
  const t = raw.trim()
  if (!t) return ''
  if (t === CV_EDU_END_ONGOING) {
    return opts?.includeOngoing ? CV_EDU_END_ONGOING : null
  }
  if (!/^\d{4}$/.test(t)) return null
  const y = Number.parseInt(t, 10)
  return isValidCvYearNumber(y) ? t : null
}

/** Prefix / exact search over the allowed year range (newest first, capped). */
export function searchCvYearOptions(
  query: string,
  limit = CV_YEAR_CHUNK_SIZE,
): CvYearDropdownOption[] {
  const q = query.trim()
  if (!q) return []
  const maxY = getCvCalendarYearMax()
  const out: CvYearDropdownOption[] = []
  if (/^\d+$/.test(q)) {
    for (let y = maxY; y >= CV_YEAR_ABSOLUTE_MIN && out.length < limit; y -= 1) {
      if (String(y).startsWith(q)) out.push(cvYearToOption(y))
    }
  }
  return out
}

/** Descending calendar years (newest first) for dropdowns. */
export function buildCvYearValues(lookback = CV_YEAR_LOOKBACK): string[] {
  const current = getCvCalendarYear()
  const min = current - lookback
  const years: string[] = []
  for (let y = current; y >= min; y -= 1) {
    years.push(String(y))
  }
  return years
}

export function buildCvStartYearDropdownOptions(
  lookback = CV_YEAR_LOOKBACK,
): CvYearDropdownOption[] {
  return buildCvYearValues(lookback).map((y) => ({ value: y, label: y }))
}

export function buildCvEndYearDropdownOptions(
  lookback = CV_YEAR_LOOKBACK,
): CvYearDropdownOption[] {
  return [
    { value: CV_EDU_END_ONGOING, label: CV_EDU_END_ONGOING },
    ...buildCvStartYearDropdownOptions(lookback),
  ]
}
