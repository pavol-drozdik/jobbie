/**
 * Expected catalog values seeded in migrations — must stay aligned with billing.config.ts
 * and supabase/migrations/20260620120000_billing_cennik.sql.
 */
import { CREDIT_PACKAGES, SUBSCRIPTION_PLAN_SPECS } from './billing.config';

export const EXPECTED_CREDIT_PACK_SEEDS = CREDIT_PACKAGES.map((p) => ({
  slug: p.slug,
  credits: p.credits,
  unitAmount: p.priceCents,
}));

export const EXPECTED_SUBSCRIPTION_PLAN_SEEDS = SUBSCRIPTION_PLAN_SPECS.map((p) => ({
  slug: p.slug,
  monthlyCredits: p.monthlyCredits,
  maxActiveJobs: p.maxActiveOffers,
  priceMonthlyCents: p.priceMonthlyCents,
  maxCvUnlocksMonthly: p.maxCvUnlocksMonthly,
  maxCvContactsMonthly: p.maxCvContactsMonthly,
  maxCvPdfDownloadsMonthly: p.maxCvPdfDownloadsMonthly,
}));
