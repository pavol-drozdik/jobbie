export type SubscriptionTrialPublicConfig = {
  enabled: boolean
  periodDays: number
}

export type CatalogSubscriptionPlanTrial = {
  slug?: string
  trialPeriodDays?: number
  trial_period_days?: number
}

export type PlanTrialDaysInput = {
  slug: string
  price_monthly_cents: number
  trial_period_days?: number
}

export function parseSubscriptionTrialFromConfig(
  config: Record<string, unknown> | null | undefined,
): SubscriptionTrialPublicConfig {
  const raw = config?.subscriptionTrial
  if (!raw || typeof raw !== 'object') {
    return { enabled: false, periodDays: 0 }
  }
  const obj = raw as Record<string, unknown>
  const periodDays =
    typeof obj.periodDays === 'number' && Number.isFinite(obj.periodDays)
      ? Math.max(0, Math.floor(obj.periodDays))
      : 0
  const enabled = obj.enabled === true && periodDays > 0
  return { enabled, periodDays }
}

export function trialPeriodDaysForPlanSlug(
  slug: string,
  config: Record<string, unknown> | null | undefined,
): number {
  const plans = config?.subscriptionPlans
  if (!Array.isArray(plans)) {
    return 0
  }
  const row = plans.find(
    (p): p is CatalogSubscriptionPlanTrial =>
      typeof p === 'object' &&
      p !== null &&
      (p as CatalogSubscriptionPlanTrial).slug === slug,
  )
  if (!row) {
    return 0
  }
  const days = row.trialPeriodDays ?? row.trial_period_days
  return typeof days === 'number' && days > 0 ? days : 0
}

export function subscriptionTrialBadgeLabel(periodDays: number): string {
  if (periodDays === 30) {
    return '1 mesiac zadarmo'
  }
  if (periodDays === 1) {
    return '1 deň zadarmo'
  }
  return `${periodDays} dní zadarmo`
}

export function resolvePlanTrialDays(
  plan: PlanTrialDaysInput,
  config: Record<string, unknown> | null | undefined,
): number {
  const fromPlans = plan.trial_period_days
  if (typeof fromPlans === 'number' && fromPlans > 0) {
    return fromPlans
  }
  const fromCatalog = trialPeriodDaysForPlanSlug(plan.slug, config)
  if (fromCatalog > 0) {
    return fromCatalog
  }
  const global = parseSubscriptionTrialFromConfig(config)
  if (global.enabled && plan.price_monthly_cents > 0) {
    return global.periodDays
  }
  return 0
}
