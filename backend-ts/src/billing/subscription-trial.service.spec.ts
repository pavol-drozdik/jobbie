import { ConfigService } from '@nestjs/config';
import type { StripeClient } from '../payments/stripe-types';
import { SubscriptionTrialService } from './subscription-trial.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('SubscriptionTrialService', () => {
  function createService(opts: {
    profileTrialUsedAt?: string | null;
    subRow?: Record<string, unknown> | null;
    priceTrialDays?: number;
    fallbackDays?: string;
  }): { service: SubscriptionTrialService; stripe: StripeClient } {
    const config = {
      get: (key: string) =>
        key === 'SUBSCRIPTION_TRIAL_FALLBACK_PERIOD_DAYS'
          ? opts.fallbackDays
          : undefined,
    } as ConfigService;
    const supabase = {
      getClient: () => ({
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      subscription_trial_used_at:
                        opts.profileTrialUsedAt ?? null,
                    },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: opts.subRow ?? null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          };
        },
      }),
    } as unknown as SupabaseService;
    const stripe = {
      prices: {
        retrieve: async () => ({
          recurring: { trial_period_days: opts.priceTrialDays ?? 0 },
          metadata: {},
        }),
      },
      subscriptions: {
        list: async () => ({ data: [] }),
      },
    } as unknown as StripeClient;
    return {
      service: new SubscriptionTrialService(supabase, config),
      stripe,
    };
  }

  it('uses fallback env when Stripe Price has no trial', async () => {
    const { service, stripe } = createService({
      priceTrialDays: 0,
      fallbackDays: '30',
    });
    const days = await service.getTrialPeriodDaysForPrice(stripe, 'price_test');
    expect(days).toBe(30);
  });

  it('returns Stripe Price trial days for eligible user', async () => {
    const { service, stripe } = createService({
      priceTrialDays: 30,
      subRow: {
        stripe_subscription_id: null,
        stripe_customer_id: null,
        subscription_plans: { price_monthly_cents: 0 },
      },
    });
    const days = await service.resolveSubscriptionTrialDays(
      'user-1',
      stripe,
      'price_test',
    );
    expect(days).toBe(30);
  });
});
