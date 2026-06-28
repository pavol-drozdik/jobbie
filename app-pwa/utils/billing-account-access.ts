/** Mirrors GET /api/billing/account fields used for plan access checks. */
export type BillingAccountSnapshot = {
  planSlug: string
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd?: boolean
  /** From GET /api/billing/account when present. */
  hasPlusOrProAccess?: boolean
  /** User may start a subscription trial (one per account; no prior paid Stripe subs). */
  subscriptionTrialEligible?: boolean
}

/**
 * Whether the user should see paid-plan benefits (matches backend `hasPaidPlanAccessFromRow`
 * and SubscriptionStatusPanel).
 */
export function hasPaidPlanAccessFromAccount(account: BillingAccountSnapshot | null): boolean {
  if (!account) return false
  const { planSlug, subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd } = account
  if (!planSlug || planSlug === 'zadarmo') return false
  const status = (subscriptionStatus ?? '').trim()
  const hasActivePaidStatus = Boolean(status) && status !== 'canceled'
  if (hasActivePaidStatus) return true
  if (cancelAtPeriodEnd) return true
  if (currentPeriodEnd && new Date(currentPeriodEnd).getTime() > Date.now()) return true
  return false
}

const PLUS_PRO_SLUGS = new Set(['plus', 'pro', 'standard', 'premium'])

export function isPlusOrProPlanSlug(planSlug: string): boolean {
  return PLUS_PRO_SLUGS.has((planSlug ?? '').trim().toLowerCase())
}

/** Active Plus or Pro only (excludes Start / Zadarmo). */
export function hasPlusOrProAccessFromAccount(
  account: BillingAccountSnapshot | null,
): boolean {
  if (!account) return false
  if (typeof account.hasPlusOrProAccess === 'boolean') {
    return account.hasPlusOrProAccess
  }
  const slug = (account.planSlug ?? '').trim()
  if (!isPlusOrProPlanSlug(slug)) return false
  return hasPaidPlanAccessFromAccount(account)
}
