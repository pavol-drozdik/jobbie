import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  buildPublicTrialSummary,
  getSubscriptionTrialFallbackDaysFromEnv,
  trialPeriodDaysFromStripePrice,
} from './subscription-trial.config';

describe('subscription-trial.config', () => {
  function configWith(values: Record<string, string | undefined>): ConfigService {
    return {
      get: (key: string) => values[key],
    } as ConfigService;
  }

  it('reads trial from Stripe Price recurring', () => {
    expect(
      trialPeriodDaysFromStripePrice({
        recurring: { trial_period_days: 30 },
      } as unknown as Stripe.Price),
    ).toBe(30);
  });

  it('reads trial from price metadata', () => {
    expect(
      trialPeriodDaysFromStripePrice({
        metadata: { jobbie_trial_days: '14' },
      } as unknown as Stripe.Price),
    ).toBe(14);
  });

  it('fallback env defaults to 0', () => {
    expect(getSubscriptionTrialFallbackDaysFromEnv(configWith({}))).toBe(0);
  });

  it('parses fallback env when set', () => {
    expect(
      getSubscriptionTrialFallbackDaysFromEnv(
        configWith({ SUBSCRIPTION_TRIAL_FALLBACK_PERIOD_DAYS: '30' }),
      ),
    ).toBe(30);
  });

  it('builds public summary from price trial list', () => {
    expect(buildPublicTrialSummary([0, 30, 14])).toEqual({
      enabled: true,
      periodDays: 30,
    });
  });
});
