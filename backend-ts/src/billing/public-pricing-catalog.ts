/** Slugs shown on /cennik and allowed for new subscription checkout. */
export const PUBLIC_SUBSCRIPTION_PLAN_SLUGS = [
  'zadarmo',
  'start',
  'plus',
  'pro',
] as const;

export type PublicSubscriptionPlanSlug =
  (typeof PUBLIC_SUBSCRIPTION_PLAN_SLUGS)[number];

export const PUBLIC_CREDIT_PACK_SLUGS = [
  'starter',
  'popular',
  'value',
  'firmy',
] as const;

export function isPublicSubscriptionPlanSlug(
  slug: string,
): slug is PublicSubscriptionPlanSlug {
  return (PUBLIC_SUBSCRIPTION_PLAN_SLUGS as readonly string[]).includes(slug);
}

export function isPublicCreditPackSlug(slug: string): boolean {
  return (PUBLIC_CREDIT_PACK_SLUGS as readonly string[]).includes(slug);
}

export function filterPublicSubscriptionPlans<T extends { slug: string }>(
  rows: T[],
): T[] {
  return rows.filter((row) => isPublicSubscriptionPlanSlug(row.slug));
}

export function filterPublicCreditPacks<T extends { slug?: string }>(
  rows: T[],
): T[] {
  return rows.filter(
    (row) => row.slug != null && isPublicCreditPackSlug(row.slug),
  );
}
