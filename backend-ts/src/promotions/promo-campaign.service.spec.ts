import { PromoCampaignService } from './promo-campaign.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreditsService } from '../billing/credits.service';
import { AuditService } from '../audit/audit.service';
import { PromoStripeCouponService } from './promo-stripe-coupon.service';
import type { PromoCampaignRow } from './promo-campaign.types';

function baseCampaign(
  overrides: Partial<PromoCampaignRow> = {},
): PromoCampaignRow {
  return {
    id: 'camp-1',
    code: 'TEST20',
    name: 'Test',
    enabled: true,
    max_redemptions: 100,
    redemption_count: 0,
    starts_at: null,
    ends_at: null,
    reward_type: 'credit_pack_discount',
    reward_credits: null,
    reward_percent: 20,
    discount_kind: 'percent',
    reward_amount_cents: null,
    reward_all_credit_packs: false,
    reward_credit_pack_slugs: ['starter'],
    reward_all_subscription_plans: true,
    reward_subscription_plan_slugs: [],
    subscription_discount_duration: null,
    subscription_discount_duration_months: null,
    code_mode: 'shared' as const,
    stripe_coupon_id: null,
    require_new_account: false,
    new_account_max_hours: 48,
    require_first_publish: false,
    require_promo_code: true,
    eligible_profile_role: 'both',
  require_no_prior_subscription: false,
    require_no_published_offer: false,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('PromoCampaignService', () => {
  function buildService(options?: {
    campaign?: PromoCampaignRow | null;
    campaigns?: PromoCampaignRow[];
    redeemed?: boolean;
    redemption?: Record<string, unknown> | null;
    profileRole?: 'company' | 'individual';
    priorSubscription?: boolean;
    poolCode?: {
      id: string;
      campaign_id: string;
      code: string;
      status: 'available' | 'redeemed' | 'disabled';
    } | null;
  }): PromoCampaignService {
    const campaign = options?.campaign ?? baseCampaign();
    const allCampaigns = options?.campaigns ?? (campaign ? [campaign] : []);
    const promoCampaignsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: options?.campaign === null ? null : campaign,
        error: null,
      }),
      single: jest.fn().mockResolvedValue({
        data: options?.campaign === null ? null : campaign,
        error: null,
      }),
      order: jest.fn().mockResolvedValue({
        data: allCampaigns,
        error: null,
      }),
    };
    const redemptionsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: options?.redeemed ? { id: 'red-1' } : null,
        error: null,
      }),
    };
    const profilesChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          created_at: new Date().toISOString(),
          role: options?.profileRole ?? 'individual',
        },
        error: null,
      }),
    };
    const jobOffersChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const poolCodesChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: options?.poolCode
          ? {
              ...options.poolCode,
              promo_campaigns: campaign,
            }
          : null,
        error: null,
      }),
    };
    const from = jest.fn((table: string) => {
      if (table === 'promo_campaign_codes') return poolCodesChain;
      if (table === 'promo_campaigns') return promoCampaignsChain;
      if (table === 'promo_campaign_redemptions') {
        if (options?.redemption) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: options.redemption,
              error: null,
            }),
          };
        }
        return redemptionsChain;
      }
      if (table === 'profiles') return profilesChain;
      if (table === 'job_offers' || table === 'company_ads') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      if (table === 'credit_packs' || table === 'subscription_plans') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return promoCampaignsChain;
    });
    const supabase = {
      getClient: () => ({ from }),
    } as unknown as SupabaseService;
    const credits = {} as CreditsService;
    const audit = { recordAuditEvent: jest.fn() } as unknown as AuditService;
    const stripeCoupons = {} as PromoStripeCouponService;
    const subscriptionTrial = {
      hasPriorPaidSubscription: jest
        .fn()
        .mockResolvedValue(options?.priorSubscription ?? false),
    } as unknown as import('../billing/subscription-trial.service').SubscriptionTrialService;
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as import('@nestjs/config').ConfigService;
    return new PromoCampaignService(
      supabase,
      credits,
      audit,
      stripeCoupons,
      subscriptionTrial,
      config,
    );
  }

  describe('validateForUser', () => {
    it('rejects wrong pack for credit_pack_discount campaign', async () => {
      const service = buildService();
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'credit_checkout',
        packSlug: 'pro',
        originalCents: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('pack_not_eligible');
    });

    it('accepts eligible pack and returns discounted preview', async () => {
      const service = buildService();
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'credit_checkout',
        packSlug: 'starter',
        originalCents: 1000,
      });
      expect(result.valid).toBe(true);
      expect(result.preview).toEqual({
        original_cents: 1000,
        discounted_cents: 800,
        percent_off: 20,
      });
    });

    it('rejects signup context for discount-only campaign', async () => {
      const service = buildService();
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'signup',
      });
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('wrong_reward_type');
    });

    it('rejects when user already redeemed campaign', async () => {
      const service = buildService({ redeemed: true });
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'credit_checkout',
        packSlug: 'starter',
        originalCents: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('already_redeemed');
    });

    it('rejects wrong profile role', async () => {
      const service = buildService({
        campaign: baseCampaign({
          eligible_profile_role: 'company',
        }),
        profileRole: 'individual',
      });
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'credit_checkout',
        packSlug: 'starter',
        originalCents: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('wrong_profile_role');
    });

    it('rejects prior subscription for first-sub-only campaign', async () => {
      const service = buildService({
        campaign: baseCampaign({
          reward_type: 'subscription_discount',
          subscription_discount_duration: 'once',
          require_no_prior_subscription: true,
        }),
        priorSubscription: true,
      });
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'subscription_checkout',
        planSlug: 'plus',
      });
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('prior_subscription');
    });

    it('returns amount_off preview', async () => {
      const service = buildService({
        campaign: baseCampaign({
          discount_kind: 'amount_off',
          reward_percent: null,
          reward_amount_cents: 200,
        }),
      });
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'credit_checkout',
        packSlug: 'starter',
        originalCents: 1000,
      });
      expect(result.valid).toBe(true);
      expect(result.preview).toEqual({
        original_cents: 1000,
        discounted_cents: 800,
        amount_off_cents: 200,
      });
    });

    it('accepts valid pool code for unique_pool campaign', async () => {
      const poolCampaign = baseCampaign({
        code: 'INFLUENCER',
        code_mode: 'unique_pool',
        reward_type: 'free_credits',
        reward_credits: 10,
        reward_percent: null,
      });
      const service = buildService({
        campaign: poolCampaign,
        poolCode: {
          id: 'pool-1',
          campaign_id: 'camp-1',
          code: 'POOLABC123',
          status: 'available',
        },
      });
      const result = await service.validateForUser('user-1', {
        code: 'POOLABC123',
        context: 'signup',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects admin label code for unique_pool campaign', async () => {
      const poolCampaign = baseCampaign({
        code: 'INFLUENCER',
        code_mode: 'unique_pool',
        reward_type: 'free_credits',
        reward_credits: 10,
        reward_percent: null,
      });
      const promoCampaignsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: poolCampaign,
            error: null,
          }),
        ),
        order: jest.fn().mockResolvedValue({
          data: [poolCampaign],
          error: null,
        }),
      };
      const poolCodesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      const from = jest.fn((table: string) => {
        if (table === 'promo_campaign_codes') return poolCodesChain;
        if (table === 'promo_campaigns') return promoCampaignsChain;
        if (table === 'promo_campaign_redemptions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { created_at: new Date().toISOString(), role: 'individual' },
              error: null,
            }),
          };
        }
        return promoCampaignsChain;
      });
      const service = new PromoCampaignService(
        { getClient: () => ({ from }) } as unknown as SupabaseService,
        {} as CreditsService,
        { recordAuditEvent: jest.fn() } as unknown as AuditService,
        {} as PromoStripeCouponService,
        {
          hasPriorPaidSubscription: jest.fn().mockResolvedValue(false),
        } as unknown as import('../billing/subscription-trial.service').SubscriptionTrialService,
        { get: jest.fn().mockReturnValue(undefined) } as unknown as import('@nestjs/config').ConfigService,
      );
      const result = await service.validateForUser('user-1', {
        code: 'INFLUENCER',
        context: 'signup',
      });
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('pool_code_invalid');
    });

    it('rejects redeemed pool code', async () => {
      const poolCampaign = baseCampaign({
        code: 'INFLUENCER',
        code_mode: 'unique_pool',
        reward_type: 'free_credits',
        reward_credits: 10,
        reward_percent: null,
      });
      const service = buildService({
        campaign: poolCampaign,
        poolCode: {
          id: 'pool-1',
          campaign_id: 'camp-1',
          code: 'POOLABC123',
          status: 'redeemed',
        },
      });
      const result = await service.validateForUser('user-1', {
        code: 'POOLABC123',
        context: 'signup',
      });
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('pool_code_exhausted');
    });

    it('shared campaign ignores pool table miss and matches campaign code', async () => {
      const service = buildService({
        campaign: baseCampaign({ code_mode: 'shared' }),
        poolCode: null,
      });
      const result = await service.validateForUser('user-1', {
        code: 'TEST20',
        context: 'credit_checkout',
        packSlug: 'starter',
        originalCents: 1000,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('getPublicActive', () => {
    it('sets registration only for active free-credit campaigns requiring a code', async () => {
      const service = buildService({
        campaigns: [
          baseCampaign({
            code: 'LAUNCH20',
            reward_type: 'free_credits',
            reward_credits: 20,
            reward_percent: null,
            require_promo_code: true,
          }),
          baseCampaign({
            id: 'camp-2',
            code: 'SAVE20',
            reward_type: 'credit_pack_discount',
            reward_percent: 20,
          }),
        ],
      });
      const result = await service.getPublicActive();
      expect(result).toEqual({
        active: true,
        registration: true,
        credit_checkout: true,
        subscription_checkout: false,
        registration_pool_mode: false,
      });
    });

    it('sets subscription_checkout for subscription discount campaigns', async () => {
      const service = buildService({
        campaigns: [
          baseCampaign({
            id: 'camp-3',
            code: 'FIRSTTIME',
            reward_type: 'subscription_discount',
            reward_percent: 50,
            subscription_discount_duration: 'once',
          }),
        ],
      });
      const result = await service.getPublicActive();
      expect(result).toEqual({
        active: true,
        registration: false,
        credit_checkout: false,
        subscription_checkout: true,
        registration_pool_mode: false,
      });
    });
  });

  describe('validateDiscountedCreditPayment', () => {
    it('accepts PI amount matching percent discount', async () => {
      const service = buildService({
        redemption: {
          id: 'red-1',
          user_id: 'user-1',
          campaign_id: 'camp-1',
          status: 'pending',
        },
      });
      const ok = await service.validateDiscountedCreditPayment(
        'pi_123',
        'user-1',
        100,
        800,
        1000,
      );
      expect(ok).toBe(true);
    });

    it('rejects PI amount that does not match discount', async () => {
      const service = buildService({
        redemption: {
          id: 'red-1',
          user_id: 'user-1',
          campaign_id: 'camp-1',
          status: 'pending',
        },
      });
      const ok = await service.validateDiscountedCreditPayment(
        'pi_123',
        'user-1',
        100,
        900,
        1000,
      );
      expect(ok).toBe(false);
    });

    it('accepts amount_off PI amount', async () => {
      const service = buildService({
        campaign: baseCampaign({
          discount_kind: 'amount_off',
          reward_percent: null,
          reward_amount_cents: 200,
        }),
        redemption: {
          id: 'red-1',
          user_id: 'user-1',
          campaign_id: 'camp-1',
          status: 'pending',
        },
      });
      const ok = await service.validateDiscountedCreditPayment(
        'pi_123',
        'user-1',
        100,
        800,
        1000,
      );
      expect(ok).toBe(true);
    });
  });
});

describe('PromoCampaignService.filterPublicValidateReasons', () => {
  it('filters out exhausted and keeps safe reasons', () => {
    const filtered = PromoCampaignService.filterPublicValidateReasons([
      'exhausted',
      'invalid_code',
      'pack_not_eligible',
    ]);
    expect(filtered).toEqual(['invalid_code', 'pack_not_eligible']);
  });
});
