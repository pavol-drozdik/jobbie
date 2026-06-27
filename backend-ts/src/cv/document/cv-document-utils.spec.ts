import {
  CV_EDUCATION_ONGOING_LABEL,
  formatCvMonthAbbrev,
  formatEducationEndYear,
  formatEducationPeriod,
  formatExperiencePeriod,
} from './cv-document-utils'

describe('cv-document-utils date labels', () => {
  it('abbreviates Slovak month names to three letters', () => {
    expect(formatCvMonthAbbrev('Január')).toBe('Jan')
    expect(formatCvMonthAbbrev('Február')).toBe('Feb')
    expect(formatCvMonthAbbrev('September')).toBe('Sep')
    expect(formatCvMonthAbbrev('01')).toBe('Jan')
    expect(formatCvMonthAbbrev('12')).toBe('Dec')
  })

  it('repairs truncated month tokens from legacy export parse', () => {
    expect(formatCvMonthAbbrev('Janu')).toBe('Jan')
  })

  it('formats experience periods with abbreviated months', () => {
    expect(
      formatExperiencePeriod({
        fromMonth: 'Január',
        fromYear: '2024',
        toMonth: 'Január',
        toYear: '2025',
        current: false,
      }),
    ).toBe('Jan 2024 - Jan 2025')
  })

  it('normalizes ongoing education end labels', () => {
    expect(formatEducationEndYear('Neukonče')).toBe(CV_EDUCATION_ONGOING_LABEL)
    expect(formatEducationPeriod('2020', 'Neukončené')).toBe('2020 - Neukončené')
  })
})
