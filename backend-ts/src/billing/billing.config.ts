/** Central billing / credit economy configuration (single source of truth). */



export type CreditPackageBadge = 'popular' | 'value' | null;



export type CreditPackageSpec = {

  readonly slug: string;

  readonly nameSk: string;

  readonly credits: number;

  readonly priceCents: number;

  readonly currency: 'eur';

  readonly badge: CreditPackageBadge;

  readonly sortOrder: number;

};



export const CREDIT_PACKAGES: readonly CreditPackageSpec[] = [

  {

    slug: 'starter',

    nameSk: 'Starter',

    credits: 5,

    priceCents: 500,

    currency: 'eur',

    badge: null,

    sortOrder: 0,

  },

  {

    slug: 'popular',

    nameSk: 'Najpopulárnejšie',

    credits: 12,

    priceCents: 1000,

    currency: 'eur',

    badge: 'popular',

    sortOrder: 1,

  },

  {

    slug: 'value',

    nameSk: 'Výhodné',

    credits: 30,

    priceCents: 2000,

    currency: 'eur',

    badge: 'value',

    sortOrder: 2,

  },

  {

    slug: 'firmy',

    nameSk: 'Pre firmy',

    credits: 75,

    priceCents: 4500,

    currency: 'eur',

    badge: null,

    sortOrder: 3,

  },

] as const;



export type SubscriptionPlanSlug = 'zadarmo' | 'start' | 'plus' | 'pro';



export type SubscriptionPlanSpec = {

  readonly slug: SubscriptionPlanSlug;

  readonly nameSk: string;

  readonly priceMonthlyCents: number;

  readonly monthlyCredits: number;

  readonly maxActiveOffers: number;

  readonly maxCvUnlocksMonthly: number | null;

  readonly maxCvContactsMonthly: number | null;

  readonly maxCvPdfDownloadsMonthly: number | null;

  readonly badge: 'recommended' | null;

  readonly sortOrder: number;

  readonly rolloverDays: number | null;

};



export const SUBSCRIPTION_PLAN_SPECS: readonly SubscriptionPlanSpec[] = [

  {

    slug: 'zadarmo',

    nameSk: 'Zadarmo',

    priceMonthlyCents: 0,

    monthlyCredits: 5,

    maxActiveOffers: 1,

    maxCvUnlocksMonthly: 10,

    maxCvContactsMonthly: 5,

    maxCvPdfDownloadsMonthly: 5,

    badge: null,

    sortOrder: 0,

    rolloverDays: null,

  },

  {

    slug: 'start',

    nameSk: 'Štart',

    priceMonthlyCents: 499,

    monthlyCredits: 10,

    maxActiveOffers: 3,

    maxCvUnlocksMonthly: 50,

    maxCvContactsMonthly: 25,

    maxCvPdfDownloadsMonthly: 25,

    badge: null,

    sortOrder: 1,

    rolloverDays: 60,

  },

  {

    slug: 'plus',

    nameSk: 'Plus',

    priceMonthlyCents: 999,

    monthlyCredits: 25,

    maxActiveOffers: 6,

    maxCvUnlocksMonthly: 75,

    maxCvContactsMonthly: 50,

    maxCvPdfDownloadsMonthly: 50,

    badge: 'recommended',

    sortOrder: 2,

    rolloverDays: 60,

  },

  {

    slug: 'pro',

    nameSk: 'Pro',

    priceMonthlyCents: 1999,

    monthlyCredits: 60,

    maxActiveOffers: 15,

    maxCvUnlocksMonthly: null,

    maxCvContactsMonthly: null,

    maxCvPdfDownloadsMonthly: null,

    badge: null,

    sortOrder: 3,

    rolloverDays: 60,

  },

] as const;



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

} as const;



export type CreditCostKey = keyof typeof CREDIT_COSTS;



export const CREDITS_PER_AD_MONTH = CREDIT_COSTS.publishServiceProfile30Days;



export function getCreditCost(key: CreditCostKey): number {

  return CREDIT_COSTS[key];

}



export function publishServiceProfileCredits(months: number): number {

  const m = Math.max(1, Math.min(12, Math.floor(months)));

  return CREDIT_COSTS.publishServiceProfile30Days * m;

}



export function formatPricePerCredit(priceCents: number, credits: number): string {

  if (credits < 1) return '—';

  const per = priceCents / 100 / credits;

  return per.toFixed(2).replace('.', ',');

}



export function creditPackageBySlug(slug: string): CreditPackageSpec | undefined {

  return CREDIT_PACKAGES.find((p) => p.slug === slug);

}



export function subscriptionPlanSpecBySlug(

  slug: string,

): SubscriptionPlanSpec | undefined {

  return SUBSCRIPTION_PLAN_SPECS.find((p) => p.slug === slug);

}



/** Legacy slug mapping for Stripe env fallbacks. */

export const LEGACY_PLAN_SLUG_MAP: Record<string, SubscriptionPlanSlug> = {

  basic: 'start',

  standard: 'plus',

  premium: 'pro',

};



export function resolvePlanSlug(slug: string): string {

  return LEGACY_PLAN_SLUG_MAP[slug as keyof typeof LEGACY_PLAN_SLUG_MAP] ?? slug;

}

