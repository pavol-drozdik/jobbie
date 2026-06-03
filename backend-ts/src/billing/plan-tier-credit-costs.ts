import {
  LEGACY_PLAN_SLUG_MAP,
  type SubscriptionPlanSlug,
} from './billing.config';

/** Per-plan credit costs shown on /cennik and enforced on publish/promote. */
export type PlanTierCreditAction =
  | 'publishJobMonth'
  | 'publishUrgentJob'
  | 'publishServiceAdMonth'
  | 'topOfCategory7Days';

export const PLAN_TIER_CREDIT_ACTIONS: readonly PlanTierCreditAction[] = [
  'publishJobMonth',
  'publishUrgentJob',
  'publishServiceAdMonth',
  'topOfCategory7Days',
] as const;

export const PUBLIC_PLAN_TIER_SLUGS: readonly SubscriptionPlanSlug[] = [
  'zadarmo',
  'start',
  'plus',
  'pro',
] as const;

const PLAN_TIER_CREDIT_COSTS: Record<
  SubscriptionPlanSlug,
  Record<PlanTierCreditAction, number>
> = {
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
};

export function normalizePlanSlugForTierCosts(slug: string): SubscriptionPlanSlug {
  const resolved =
    LEGACY_PLAN_SLUG_MAP[slug as keyof typeof LEGACY_PLAN_SLUG_MAP] ?? slug;
  if (
    resolved === 'zadarmo' ||
    resolved === 'start' ||
    resolved === 'plus' ||
    resolved === 'pro'
  ) {
    return resolved;
  }
  return 'zadarmo';
}

export function getPlanTierCreditCost(
  planSlug: string,
  action: PlanTierCreditAction,
): number {
  const slug = normalizePlanSlugForTierCosts(planSlug);
  return PLAN_TIER_CREDIT_COSTS[slug][action];
}

/** Public shape for GET /api/billing/config (PWA compare table + wizards). */
export function getPublicPlanTierCreditCosts(): Record<
  string,
  Record<PlanTierCreditAction, number>
> {
  const out: Record<string, Record<PlanTierCreditAction, number>> = {};
  for (const slug of PUBLIC_PLAN_TIER_SLUGS) {
    out[slug] = { ...PLAN_TIER_CREDIT_COSTS[slug] };
  }
  return out;
}
