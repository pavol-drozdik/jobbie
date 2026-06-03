import { S } from '~/utils/strings'

export type PlanCvLimits = {
  slug: string
  max_cv_unlocks_monthly: number | null
  max_cv_contacts_monthly: number | null
  max_cv_pdf_downloads_monthly: number | null
}

export type CvLimitKind = 'unlock' | 'contact' | 'pdf'

const ZADARMO_CV_LIMITS: Record<CvLimitKind, number> = {
  unlock: 10,
  contact: 5,
  pdf: 5,
}

export function cvMonthlyLimitLabel(plan: PlanCvLimits, kind: CvLimitKind): string {
  const limit =
    kind === 'unlock'
      ? plan.max_cv_unlocks_monthly
      : kind === 'contact'
        ? plan.max_cv_contacts_monthly
        : plan.max_cv_pdf_downloads_monthly
  if (limit !== null && limit !== undefined) {
    return `${limit}${S.pricingCvPerMonth}`
  }
  if (plan.slug === 'zadarmo') {
    return `${ZADARMO_CV_LIMITS[kind]}${S.pricingCvPerMonth}`
  }
  return S.pricingCvUnlimited
}
