/** Must match backend `public-pricing-catalog.ts`. */
export const PUBLIC_SUBSCRIPTION_PLAN_SLUGS = [
  'zadarmo',
  'start',
  'plus',
  'pro',
] as const

export type PublicSubscriptionPlanSlug =
  (typeof PUBLIC_SUBSCRIPTION_PLAN_SLUGS)[number]

export function isPublicSubscriptionPlanSlug(
  slug: string,
): slug is PublicSubscriptionPlanSlug {
  return (PUBLIC_SUBSCRIPTION_PLAN_SLUGS as readonly string[]).includes(slug)
}

export function filterPublicSubscriptionPlans<T extends { slug: string }>(
  rows: T[],
): T[] {
  return rows.filter((row) => isPublicSubscriptionPlanSlug(row.slug))
}
