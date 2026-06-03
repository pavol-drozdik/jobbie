import { resolvePlanSlug } from './billing.config';
import { hasPaidPlanAccessFromRow } from './paid-plan-access.service';

export const PLUS_PRO_PLAN_SLUGS = ['plus', 'pro'] as const;

export type PlusProPlanSlug = (typeof PLUS_PRO_PLAN_SLUGS)[number];

export const APPLICANT_AUTO_REPLIES_PLUS_PRO_MESSAGE =
  'Automatické odpovede sú dostupné len v plánoch Plus a Pro.';

export function isPlusOrProPlanSlug(slug: string): boolean {
  const resolved = resolvePlanSlug(slug);
  return (PLUS_PRO_PLAN_SLUGS as readonly string[]).includes(resolved);
}

/** Active Plus or Pro subscription (excludes Start and Zadarmo). */
export function hasPlusOrProAccessFromRow(
  planSlug: string,
  status: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: string | null,
): boolean {
  const resolved = resolvePlanSlug(planSlug);
  if (!isPlusOrProPlanSlug(resolved)) {
    return false;
  }
  return hasPaidPlanAccessFromRow(
    resolved,
    status,
    cancelAtPeriodEnd,
    currentPeriodEnd,
  );
}
