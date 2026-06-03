import { S } from '~/utils/strings'

/** Keep in sync with backend-ts/src/billing/plan-tier-credit-costs.ts */
export type PlanTierCreditAction =
  | 'publishJobMonth'
  | 'publishUrgentJob'
  | 'publishServiceAdMonth'
  | 'topOfCategory7Days'

export type PlanTierCreditCostsMatrix = Record<
  string,
  Record<PlanTierCreditAction, number>
>

const FALLBACK_PLAN_TIER_CREDIT_COSTS: PlanTierCreditCostsMatrix = {
  zadarmo: {
    publishJobMonth: 3,
    publishUrgentJob: 2,
    publishServiceAdMonth: 3,
    topOfCategory7Days: 10,
  },
  start: {
    publishJobMonth: 3,
    publishUrgentJob: 2,
    publishServiceAdMonth: 3,
    topOfCategory7Days: 10,
  },
  plus: {
    publishJobMonth: 3,
    publishUrgentJob: 0,
    publishServiceAdMonth: 3,
    topOfCategory7Days: 5,
  },
  pro: {
    publishJobMonth: 3,
    publishUrgentJob: 0,
    publishServiceAdMonth: 3,
    topOfCategory7Days: 0,
  },
}

export function parsePlanTierCreditCostsFromConfig(
  raw: unknown,
): PlanTierCreditCostsMatrix {
  if (!raw || typeof raw !== 'object') {
    return FALLBACK_PLAN_TIER_CREDIT_COSTS
  }
  const matrix = raw as PlanTierCreditCostsMatrix
  const out: PlanTierCreditCostsMatrix = {}
  for (const slug of Object.keys(FALLBACK_PLAN_TIER_CREDIT_COSTS)) {
    const row = matrix[slug]
    const fallback = FALLBACK_PLAN_TIER_CREDIT_COSTS[slug]
    if (!row || typeof row !== 'object') {
      out[slug] = { ...fallback }
      continue
    }
    out[slug] = {
      publishJobMonth: numberOr(row.publishJobMonth, fallback.publishJobMonth),
      publishUrgentJob: numberOr(row.publishUrgentJob, fallback.publishUrgentJob),
      publishServiceAdMonth: numberOr(
        row.publishServiceAdMonth,
        fallback.publishServiceAdMonth,
      ),
      topOfCategory7Days: numberOr(
        row.topOfCategory7Days,
        fallback.topOfCategory7Days,
      ),
    }
  }
  return out
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function getPlanTierCreditCost(
  matrix: PlanTierCreditCostsMatrix,
  planSlug: string,
  action: PlanTierCreditAction,
): number {
  const row = matrix[planSlug] ?? matrix.zadarmo ?? FALLBACK_PLAN_TIER_CREDIT_COSTS.zadarmo
  return row[action]
}

export function formatPlanTierCreditCostLabel(cost: number): string {
  if (cost < 1) return S.pricingCvFreeLabel
  return `${cost} ${S.credits}`
}

export const PLAN_TIER_COMPARE_ROWS: ReadonlyArray<{
  key: PlanTierCreditAction
  label: string
}> = [
  { key: 'publishJobMonth', label: S.pricingComparePublishJobMonth },
  { key: 'publishServiceAdMonth', label: S.pricingComparePublishServiceAdMonth },
  { key: 'publishUrgentJob', label: S.pricingComparePublishUrgentJob },
  { key: 'topOfCategory7Days', label: S.pricingCompareTopListing },
]

/** Boolean plan features in Porovnanie plánov (not credit-priced). */
export const PLAN_COMPARE_FEATURE_ROWS: ReadonlyArray<{
  key: string
  label: string
}> = [{ key: 'applicantAutoReplies', label: S.pricingCompareApplicantAutoReplies }]
