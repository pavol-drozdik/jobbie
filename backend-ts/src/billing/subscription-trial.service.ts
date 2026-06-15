import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CheckoutSubscriptionData,
  StripeClient,
  SubscriptionCreateParams,
} from '../payments/stripe-types';
import { SupabaseService } from '../supabase/supabase.service';
import {
  buildPublicTrialSummary,
  getSubscriptionTrialFallbackDaysFromEnv,
  SubscriptionTrialPublicConfig,
  trialPeriodDaysFromStripePrice,
} from './subscription-trial.config';

/** Subscriptions that count as having used Stripe Billing (excludes abandoned incomplete checkouts). */
const STRIPE_SUBSCRIPTION_HISTORY_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);

type PriceTrialCacheEntry = { days: number; expiresAt: number };

const PRICE_TRIAL_CACHE_TTL_MS = 300_000;

@Injectable()
export class SubscriptionTrialService {
  private readonly priceTrialCache = new Map<string, PriceTrialCacheEntry>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async getTrialPeriodDaysForPrice(
    stripe: StripeClient,
    stripePriceId: string,
  ): Promise<number> {
    const priceId = stripePriceId?.trim();
    if (!priceId) {
      return 0;
    }
    const cached = this.priceTrialCache.get(priceId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.days;
    }
    try {
      const price = await stripe.prices.retrieve(priceId);
      const fromStripe = trialPeriodDaysFromStripePrice(price);
      const days =
        fromStripe > 0
          ? fromStripe
          : getSubscriptionTrialFallbackDaysFromEnv(this.config);
      this.priceTrialCache.set(priceId, {
        days,
        expiresAt: Date.now() + PRICE_TRIAL_CACHE_TTL_MS,
      });
      return days;
    } catch {
      return getSubscriptionTrialFallbackDaysFromEnv(this.config);
    }
  }

  async getPublicTrialConfig(
    stripe: StripeClient,
    stripePriceIds: string[],
  ): Promise<SubscriptionTrialPublicConfig> {
    const unique = [...new Set(stripePriceIds.map((id) => id?.trim()).filter(Boolean))];
    const trialDays = await Promise.all(
      unique.map((id) => this.getTrialPeriodDaysForPrice(stripe, id as string)),
    );
    return buildPublicTrialSummary(trialDays);
  }

  async isUserEligibleForSubscriptionTrial(
    userId: string,
    stripe: StripeClient,
  ): Promise<boolean> {
    const supabase = this.supabase.getClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_trial_used_at')
      .eq('id', userId)
      .maybeSingle();
    if ((profile as { subscription_trial_used_at?: string | null } | null)
      ?.subscription_trial_used_at) {
      return false;
    }
    const { data: subRow } = await supabase
      .from('user_subscriptions')
      .select(
        'stripe_subscription_id, stripe_customer_id, subscription_plans(price_monthly_cents)',
      )
      .eq('user_id', userId)
      .maybeSingle();
    const row = subRow as {
      stripe_subscription_id?: string | null;
      stripe_customer_id?: string | null;
      subscription_plans?: { price_monthly_cents?: number };
    } | null;
    if (row?.stripe_subscription_id?.trim()) {
      return false;
    }
    if ((row?.subscription_plans?.price_monthly_cents ?? 0) > 0) {
      return false;
    }
    const customerId = row?.stripe_customer_id?.trim();
    if (!customerId) {
      return true;
    }
    const listed = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
    for (const sub of listed.data) {
      if (STRIPE_SUBSCRIPTION_HISTORY_STATUSES.has(sub.status)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Trial days to apply on subscribe when eligible; 0 when not.
   * Caller must set `trial_end: 'now'` when this returns 0 but the Price has a default trial.
   */
  async resolveSubscriptionTrialDays(
    userId: string,
    stripe: StripeClient,
    stripePriceId: string,
  ): Promise<number> {
    const priceTrialDays = await this.getTrialPeriodDaysForPrice(
      stripe,
      stripePriceId,
    );
    if (priceTrialDays < 1) {
      return 0;
    }
    const eligible = await this.isUserEligibleForSubscriptionTrial(
      userId,
      stripe,
    );
    if (!eligible) {
      return 0;
    }
    return priceTrialDays;
  }

  applyTrialToSubscriptionParams(
    params: SubscriptionCreateParams,
    trialPeriodDays: number,
    options: { suppressPriceDefaultTrial: boolean },
  ): void {
    if (options.suppressPriceDefaultTrial) {
      params.trial_end = 'now';
      return;
    }
    if (trialPeriodDays < 1) {
      return;
    }
    params.trial_period_days = trialPeriodDays;
    params.trial_settings = {
      end_behavior: { missing_payment_method: 'cancel' },
    };
  }

  applyTrialToCheckoutSubscriptionData(
    data: CheckoutSubscriptionData,
    trialPeriodDays: number,
    options: { suppressPriceDefaultTrial: boolean },
  ): void {
    if (options.suppressPriceDefaultTrial) {
      data.trial_end = Math.floor(Date.now() / 1000);
      return;
    }
    if (trialPeriodDays < 1) {
      return;
    }
    data.trial_period_days = trialPeriodDays;
    data.trial_settings = {
      end_behavior: { missing_payment_method: 'cancel' },
    };
  }

  async markSubscriptionTrialUsed(userId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({ subscription_trial_used_at: new Date().toISOString() })
      .eq('id', userId)
      .is('subscription_trial_used_at', null);
    if (error) {
      throw new Error(
        `markSubscriptionTrialUsed failed for ${userId}: ${error.message}`,
      );
    }
  }
}
