/**

 * Keep in sync with backend-ts/src/promotions/promo-campaign.service.ts

 * (isScheduleAndCapacityOk, collectEligibilityIssues).

 */



export type PromoRedemptionContext =

  | 'signup'

  | 'first_publish'

  | 'credit_checkout'

  | 'subscription_checkout';



export type SimulateCampaign = {

  code: string;

  enabled: boolean;

  max_redemptions: number | null;

  redemption_count: number;

  starts_at: string | null;

  ends_at: string | null;

  archived_at?: string | null;

  reward_type: 'free_credits' | 'credit_pack_discount' | 'subscription_discount';

  reward_all_credit_packs: boolean;

  reward_credit_pack_slugs: string[];

  reward_all_subscription_plans: boolean;

  reward_subscription_plan_slugs: string[];

  require_new_account: boolean;

  new_account_max_hours: number;

  require_first_publish: boolean;

  require_promo_code: boolean;

  eligible_profile_role: 'both' | 'company' | 'individual';

  require_no_prior_subscription: boolean;

  require_no_published_offer: boolean;

  code_mode?: 'shared' | 'unique_pool';

};



export type SimulateScenario = {

  context: PromoRedemptionContext;

  code?: string;

  account_age_hours?: number;

  has_published?: boolean;

  pack_slug?: string;

  plan_slug?: string;

  already_redeemed?: boolean;

  profile_role?: 'company' | 'individual';

  has_prior_subscription?: boolean;

  pool_code_available?: boolean;

};



function normalizeCode(code: string): string {

  return code.trim().toUpperCase();

}



function isScheduleAndCapacityOk(

  campaign: SimulateCampaign,

  nowMs: number,

): boolean {

  if (campaign.archived_at) return false;

  if (!campaign.enabled) return false;

  if (campaign.starts_at && new Date(campaign.starts_at).getTime() > nowMs) {

    return false;

  }

  if (campaign.ends_at && new Date(campaign.ends_at).getTime() <= nowMs) {

    return false;

  }

  if (

    campaign.max_redemptions != null &&

    campaign.redemption_count >= campaign.max_redemptions

  ) {

    return false;

  }

  return true;

}



export function simulatePromoEligibility(

  campaign: SimulateCampaign,

  scenario: SimulateScenario,

  nowMs: number = Date.now(),

): { valid: boolean; reasons: string[] } {

  const reasons: string[] = [];

  const code = scenario.code?.trim();

  const codeMode = campaign.code_mode ?? 'shared';



  if (!isScheduleAndCapacityOk(campaign, nowMs)) {

    reasons.push(

      campaign.max_redemptions != null &&

      campaign.redemption_count >= campaign.max_redemptions

        ? 'exhausted'

        : 'inactive',

    );

  }



  if (codeMode === 'unique_pool') {

    if (campaign.require_promo_code) {

      if (!code) {

        reasons.push('promo_code_required');

      } else if (normalizeCode(code) === normalizeCode(campaign.code)) {

        reasons.push('pool_code_invalid');

      } else if (!scenario.pool_code_available) {

        reasons.push('pool_code_exhausted');

      }

    } else if (code) {

      if (normalizeCode(code) === normalizeCode(campaign.code)) {

        reasons.push('pool_code_invalid');

      } else if (!scenario.pool_code_available) {

        reasons.push('pool_code_exhausted');

      }

    }

  } else if (campaign.require_promo_code) {

    if (!code) {

      reasons.push('promo_code_required');

    } else if (normalizeCode(code) !== normalizeCode(campaign.code)) {

      reasons.push('invalid_code');

    }

  } else if (code && normalizeCode(code) !== normalizeCode(campaign.code)) {

    reasons.push('invalid_code');

  }



  if (scenario.context === 'signup' || scenario.context === 'first_publish') {

    if (campaign.reward_type !== 'free_credits') {

      reasons.push('wrong_reward_type');

    }

  }

  if (scenario.context === 'credit_checkout') {

    if (campaign.reward_type !== 'credit_pack_discount') {

      reasons.push('wrong_reward_type');

    } else if (

      scenario.pack_slug &&

      !campaign.reward_all_credit_packs &&

      !campaign.reward_credit_pack_slugs.includes(scenario.pack_slug)

    ) {

      reasons.push('pack_not_eligible');

    }

  }

  if (scenario.context === 'subscription_checkout') {

    if (campaign.reward_type !== 'subscription_discount') {

      reasons.push('wrong_reward_type');

    } else if (

      scenario.plan_slug &&

      !campaign.reward_all_subscription_plans &&

      !campaign.reward_subscription_plan_slugs.includes(scenario.plan_slug)

    ) {

      reasons.push('plan_not_eligible');

    }

  }



  if (scenario.already_redeemed) {

    reasons.push('already_redeemed');

  }



  if (campaign.require_new_account) {

    const ageHours = scenario.account_age_hours;

    if (ageHours == null || ageHours > campaign.new_account_max_hours) {

      reasons.push('account_too_old');

    }

  }



  if (campaign.require_first_publish) {

    if (!scenario.has_published) {

      reasons.push('first_publish_required');

    }

  }



  if (

    campaign.eligible_profile_role !== 'both' &&

    scenario.profile_role &&

    scenario.profile_role !== campaign.eligible_profile_role

  ) {

    reasons.push('wrong_profile_role');

  }



  if (

    campaign.require_no_prior_subscription &&

    scenario.context === 'subscription_checkout' &&

    scenario.has_prior_subscription

  ) {

    reasons.push('prior_subscription');

  }



  if (

    campaign.require_no_published_offer &&

    (scenario.context === 'credit_checkout' ||

      scenario.context === 'subscription_checkout') &&

    scenario.has_published

  ) {

    reasons.push('prior_published_offer');

  }



  const unique = [...new Set(reasons)];

  return { valid: unique.length === 0, reasons: unique };

}



export function draftDtoToSimulateCampaign(

  dto: Record<string, unknown>,

  redemptionCount = 0,

): SimulateCampaign {

  return {

    code: String(dto.code ?? ''),

    enabled: dto.enabled !== false,

    max_redemptions:

      dto.max_redemptions === null || dto.max_redemptions === undefined

        ? null

        : Number(dto.max_redemptions),

    redemption_count: redemptionCount,

    starts_at: (dto.starts_at as string | null) ?? null,

    ends_at: (dto.ends_at as string | null) ?? null,

    archived_at: (dto.archived_at as string | null) ?? null,

    reward_type: dto.reward_type as SimulateCampaign['reward_type'],

    reward_all_credit_packs: dto.reward_all_credit_packs !== false,

    reward_credit_pack_slugs: (dto.reward_credit_pack_slugs as string[]) ?? [],

    reward_all_subscription_plans: dto.reward_all_subscription_plans !== false,

    reward_subscription_plan_slugs:

      (dto.reward_subscription_plan_slugs as string[]) ?? [],

    require_new_account: dto.require_new_account === true,

    new_account_max_hours: Number(dto.new_account_max_hours ?? 48),

    require_first_publish: dto.require_first_publish === true,

    require_promo_code: dto.require_promo_code !== false,

    eligible_profile_role:

      (dto.eligible_profile_role as SimulateCampaign['eligible_profile_role']) ??

      'both',

    require_no_prior_subscription: dto.require_no_prior_subscription === true,

    require_no_published_offer: dto.require_no_published_offer === true,

    code_mode: (dto.code_mode as SimulateCampaign['code_mode']) ?? 'shared',

  };

}



export function resolveDiscountFields(

  dto: Record<string, unknown>,

  rewardType: string,

): {

  discount_kind: 'percent' | 'amount_off' | null;

  reward_percent: number | null;

  reward_amount_cents: number | null;

} {

  if (rewardType === 'free_credits') {

    return {

      discount_kind: null,

      reward_percent: null,

      reward_amount_cents: null,

    };

  }

  const kind = (dto.discount_kind as string | undefined) ?? 'percent';

  if (kind === 'amount_off') {

    return {

      discount_kind: 'amount_off',

      reward_percent: null,

      reward_amount_cents:

        dto.reward_amount_cents == null ? null : Number(dto.reward_amount_cents),

    };

  }

  return {

    discount_kind: 'percent',

    reward_percent: dto.reward_percent == null ? null : Number(dto.reward_percent),

    reward_amount_cents: null,

  };

}

