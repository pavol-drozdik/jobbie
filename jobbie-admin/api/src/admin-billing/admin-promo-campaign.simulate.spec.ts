import {
  simulatePromoEligibility,
  draftDtoToSimulateCampaign,
} from './admin-promo-campaign.simulate';

describe('simulatePromoEligibility', () => {
  const baseCampaign = {
    code: 'TEST20',
    enabled: true,
    max_redemptions: 100,
    redemption_count: 0,
    starts_at: null,
    ends_at: null,
    reward_type: 'credit_pack_discount' as const,
    reward_all_credit_packs: false,
    reward_credit_pack_slugs: ['starter'],
    reward_all_subscription_plans: true,
    reward_subscription_plan_slugs: [] as string[],
    require_new_account: false,
    new_account_max_hours: 48,
    require_first_publish: false,
    require_promo_code: true,
    eligible_profile_role: 'both' as const,
    require_no_prior_subscription: false,
    require_no_published_offer: false,
    code_mode: 'shared' as const,
  };

  it('rejects wrong pack for credit checkout', () => {
    const result = simulatePromoEligibility(baseCampaign, {
      context: 'credit_checkout',
      code: 'TEST20',
      pack_slug: 'pro',
    });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('pack_not_eligible');
  });

  it('accepts eligible pack', () => {
    const result = simulatePromoEligibility(baseCampaign, {
      context: 'credit_checkout',
      code: 'TEST20',
      pack_slug: 'starter',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects signup context for discount campaign', () => {
    const result = simulatePromoEligibility(baseCampaign, {
      context: 'signup',
      code: 'TEST20',
    });
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('wrong_reward_type');
  });

  it('rejects when account is too old', () => {
    const result = simulatePromoEligibility(
      { ...baseCampaign, require_new_account: true },
      {
        context: 'credit_checkout',
        code: 'TEST20',
        pack_slug: 'starter',
        account_age_hours: 72,
      },
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('account_too_old');
  });

  it('requires first publish for free credits campaign', () => {
    const result = simulatePromoEligibility(
      {
        ...baseCampaign,
        reward_type: 'free_credits',
        require_first_publish: true,
      },
      {
        context: 'first_publish',
        code: 'TEST20',
        has_published: false,
      },
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('first_publish_required');
  });

  it('rejects wrong profile role', () => {
    const result = simulatePromoEligibility(
      { ...baseCampaign, eligible_profile_role: 'company' },
      {
        context: 'credit_checkout',
        code: 'TEST20',
        pack_slug: 'starter',
        profile_role: 'individual',
      },
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('wrong_profile_role');
  });

  it('rejects prior subscription when required', () => {
    const result = simulatePromoEligibility(
      {
        ...baseCampaign,
        reward_type: 'subscription_discount',
        require_no_prior_subscription: true,
      },
      {
        context: 'subscription_checkout',
        code: 'TEST20',
        has_prior_subscription: true,
      },
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('prior_subscription');
  });

  it('rejects prior published offer when required', () => {
    const result = simulatePromoEligibility(
      {
        ...baseCampaign,
        require_no_published_offer: true,
      },
      {
        context: 'credit_checkout',
        code: 'TEST20',
        pack_slug: 'starter',
        has_published: true,
      },
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('prior_published_offer');
  });

  it('accepts unique_pool code when pool entry is available', () => {
    const result = simulatePromoEligibility(
      {
        ...baseCampaign,
        code: 'INFLUENCER',
        code_mode: 'unique_pool',
        reward_type: 'free_credits',
      },
      {
        context: 'signup',
        code: 'POOLCODE1',
        pool_code_available: true,
      },
    );
    expect(result.valid).toBe(true);
  });

  it('rejects admin label for unique_pool campaign', () => {
    const result = simulatePromoEligibility(
      {
        ...baseCampaign,
        code: 'INFLUENCER',
        code_mode: 'unique_pool',
        reward_type: 'free_credits',
      },
      {
        context: 'signup',
        code: 'INFLUENCER',
        pool_code_available: true,
      },
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('pool_code_invalid');
  });

  it('rejects exhausted pool code', () => {
    const result = simulatePromoEligibility(
      {
        ...baseCampaign,
        code: 'INFLUENCER',
        code_mode: 'unique_pool',
        reward_type: 'free_credits',
      },
      {
        context: 'signup',
        code: 'POOLCODE1',
        pool_code_available: false,
      },
    );
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('pool_code_exhausted');
  });
});

describe('draftDtoToSimulateCampaign', () => {
  it('maps draft dto fields', () => {
    const row = draftDtoToSimulateCampaign({
      code: 'LAUNCH20',
      enabled: true,
      reward_type: 'free_credits',
      require_promo_code: true,
      require_first_publish: false,
    });
    expect(row.code).toBe('LAUNCH20');
    expect(row.reward_type).toBe('free_credits');
    expect(row.require_promo_code).toBe(true);
  });
});
