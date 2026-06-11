import type { CvLimitKind } from '~/utils/pricing-cv-limits'
import { resolveCvMonthlyCapForDisplay } from '~/utils/pricing-cv-limits'
import { S } from '~/utils/strings'

export type CvUsageSnapshot = {
  unlocksCount: number
  contactsCount: number
  pdfDownloadsCount: number
}

export type CvLimitsSnapshot = {
  maxCvUnlocksMonthly: number | null
  maxCvContactsMonthly: number | null
  maxCvPdfDownloadsMonthly: number | null
}

function pickCount(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return 0
}

function pickLimit(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in obj)) continue
    const value = obj[key]
    if (value === null) return null
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

/** Normalize billing account cvUsage from API (camelCase or legacy snake_case). */
export function normalizeCvUsage(raw: unknown): CvUsageSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  return {
    unlocksCount: pickCount(row, 'unlocksCount', 'unlocks_count'),
    contactsCount: pickCount(row, 'contactsCount', 'contacts_count'),
    pdfDownloadsCount: pickCount(row, 'pdfDownloadsCount', 'pdf_downloads_count'),
  }
}

/** Normalize billing account cvLimits from API (camelCase or legacy snake_case). */
export function normalizeCvLimits(raw: unknown): CvLimitsSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  return {
    maxCvUnlocksMonthly: pickLimit(row, 'maxCvUnlocksMonthly', 'max_cv_unlocks_monthly'),
    maxCvContactsMonthly: pickLimit(row, 'maxCvContactsMonthly', 'max_cv_contacts_monthly'),
    maxCvPdfDownloadsMonthly: pickLimit(
      row,
      'maxCvPdfDownloadsMonthly',
      'max_cv_pdf_downloads_monthly',
    ),
  }
}

function formatUsageRow(
  label: string,
  used: number,
  max: number | null | undefined,
  planSlug: string,
  kind: CvLimitKind,
): { label: string; value: string } {
  const cap = resolveCvMonthlyCapForDisplay(planSlug, kind, max)
  return { label, value: `${used} / ${cap}` }
}

/** Rows for settings/pricing “Databáza životopisov (tento mesiac)” usage panel. */
export function buildCvDatabaseUsageRows(params: {
  cvUsage: unknown
  cvLimits: unknown
  planSlug?: string | null
}): { label: string; value: string }[] {
  const usage = normalizeCvUsage(params.cvUsage)
  const limits = normalizeCvLimits(params.cvLimits)
  if (!usage || !limits) return []

  const planSlug = (params.planSlug ?? 'zadarmo').trim() || 'zadarmo'

  return [
    formatUsageRow(
      S.pricingCvUnlock,
      usage.unlocksCount,
      limits.maxCvUnlocksMonthly,
      planSlug,
      'unlock',
    ),
    formatUsageRow(
      S.pricingCvContact,
      usage.contactsCount,
      limits.maxCvContactsMonthly,
      planSlug,
      'contact',
    ),
    formatUsageRow(
      S.pricingCvPdf,
      usage.pdfDownloadsCount,
      limits.maxCvPdfDownloadsMonthly,
      planSlug,
      'pdf',
    ),
  ]
}
