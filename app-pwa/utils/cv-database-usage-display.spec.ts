import { describe, expect, it } from 'vitest'
import { buildCvDatabaseUsageRows } from '~/utils/cv-database-usage-display'

describe('buildCvDatabaseUsageRows', () => {
  it('shows zadarmo caps when API limits are null', () => {
    const rows = buildCvDatabaseUsageRows({
      planSlug: 'zadarmo',
      cvUsage: { unlocksCount: 2, contactsCount: 1, pdfDownloadsCount: 0 },
      cvLimits: {
        maxCvUnlocksMonthly: null,
        maxCvContactsMonthly: null,
        maxCvPdfDownloadsMonthly: null,
      },
    })
    expect(rows).toHaveLength(3)
    expect(rows[0]?.value).toBe('2 / 10')
    expect(rows[1]?.value).toBe('1 / 5')
    expect(rows[2]?.value).toBe('0 / 5')
  })

  it('shows infinity cap for pro unlimited plan', () => {
    const rows = buildCvDatabaseUsageRows({
      planSlug: 'pro',
      cvUsage: { unlocksCount: 3, contactsCount: 0, pdfDownloadsCount: 1 },
      cvLimits: {
        maxCvUnlocksMonthly: null,
        maxCvContactsMonthly: null,
        maxCvPdfDownloadsMonthly: null,
      },
    })
    expect(rows[0]?.value).toBe('3 / ∞')
  })

  it('accepts snake_case usage fields from API', () => {
    const rows = buildCvDatabaseUsageRows({
      planSlug: 'start',
      cvUsage: { unlocks_count: 4, contacts_count: 2, pdf_downloads_count: 1 },
      cvLimits: {
        max_cv_unlocks_monthly: 50,
        max_cv_contacts_monthly: 25,
        max_cv_pdf_downloads_monthly: 25,
      },
    })
    expect(rows[0]?.value).toBe('4 / 50')
    expect(rows[1]?.value).toBe('2 / 25')
    expect(rows[2]?.value).toBe('1 / 25')
  })
})
