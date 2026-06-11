import { describe, expect, it } from 'vitest'
import { resolvePlanTrialDays } from './subscription-trial'

describe('resolvePlanTrialDays', () => {
  it('prefers plan row trial_period_days', () => {
    expect(
      resolvePlanTrialDays(
        { slug: 'plus', price_monthly_cents: 990, trial_period_days: 14 },
        null,
      ),
    ).toBe(14)
  })

  it('falls back to catalog plan trial days', () => {
    expect(
      resolvePlanTrialDays(
        { slug: 'plus', price_monthly_cents: 990 },
        {
          subscriptionPlans: [{ slug: 'plus', trialPeriodDays: 30 }],
        },
      ),
    ).toBe(30)
  })

  it('uses global trial config for paid plans', () => {
    expect(
      resolvePlanTrialDays(
        { slug: 'plus', price_monthly_cents: 990 },
        { subscriptionTrial: { enabled: true, periodDays: 30 } },
      ),
    ).toBe(30)
  })

  it('returns zero for free plans', () => {
    expect(
      resolvePlanTrialDays(
        { slug: 'free', price_monthly_cents: 0 },
        { subscriptionTrial: { enabled: true, periodDays: 30 } },
      ),
    ).toBe(0)
  })
})
