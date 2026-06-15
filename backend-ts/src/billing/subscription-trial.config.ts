import { ConfigService } from '@nestjs/config';
import type { Price } from '../payments/stripe-types';

export type SubscriptionTrialPublicConfig = {
  enabled: boolean;
  periodDays: number;
};

/**
 * Optional fallback when Stripe Price has no trial (metadata or recurring).
 * Prefer Stripe Price metadata `trial_period_days` / `jobbie_trial_days`. Default 0 = off.
 */
export function getSubscriptionTrialFallbackDaysFromEnv(
  config: ConfigService,
): number {
  const raw = config.get<string>('SUBSCRIPTION_TRIAL_FALLBACK_PERIOD_DAYS');
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return 0;
  }
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

/**
 * Trial length from Stripe Price (Dashboard → Product → Price → trial).
 * Optional metadata `trial_period_days` or `jobbie_trial_days` if recurring trial is unset.
 */
export function trialPeriodDaysFromStripePrice(price: Price): number {
  const recurringDays = price.recurring?.trial_period_days;
  if (typeof recurringDays === 'number' && recurringDays > 0) {
    return recurringDays;
  }
  const meta = price.metadata ?? {};
  const raw = meta.trial_period_days ?? meta.jobbie_trial_days;
  if (raw === undefined || raw === null) {
    return 0;
  }
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }
  return parsed;
}

export function buildPublicTrialSummary(
  trialDaysByPrice: number[],
): SubscriptionTrialPublicConfig {
  const periodDays = trialDaysByPrice.reduce(
    (max, days) => (days > max ? days : max),
    0,
  );
  return {
    enabled: periodDays > 0,
    periodDays,
  };
}
