export interface CvMonthYear {
  month: number | null
  year: number | null
}

export function isoDateToMonthYear(iso: string | null | undefined): CvMonthYear {
  if (!iso || typeof iso !== 'string') {
    return { month: null, year: null }
  }
  const m = /^(\d{4})-(\d{2})/.exec(iso.trim())
  if (!m) {
    return { month: null, year: null }
  }
  return { year: Number(m[1]), month: Number(m[2]) }
}

export function monthYearToIsoFirstDay(my: CvMonthYear): string | null {
  if (my.month == null || my.year == null) {
    return null
  }
  return `${String(my.year).padStart(4, '0')}-${String(my.month).padStart(2, '0')}-01`
}

export function yearToMonthYearJanuary(year: number | null | undefined): CvMonthYear {
  if (year == null || !Number.isFinite(Number(year))) {
    return { month: null, year: null }
  }
  return { month: 1, year: Math.round(Number(year)) }
}
