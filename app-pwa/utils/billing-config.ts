/** Client mirror of backend CREDIT_COSTS (publish/promote UX only). */

export const CREDIT_COSTS = {
  publishJob30Days: 3,
  publishUrgentJob30Days: 3,
  renewJob30Days: 3,
  renewUrgentJob30Days: 3,
  publishServiceProfile30Days: 3,
  renewServiceProfile30Days: 3,
  urgentBadge7Days: 2,
  highlightedCard7Days: 3,
  topOfCategory7Days: 6,
  homepageFeatured7Days: 8,
} as const

export const CREDITS_PER_AD_MONTH = CREDIT_COSTS.publishServiceProfile30Days

export function publishServiceProfileCredits(months: number): number {
  const m = Math.max(1, Math.min(12, Math.floor(months)))
  return CREDIT_COSTS.publishServiceProfile30Days * m
}
