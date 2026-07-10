export type PromoRewardType =

  | 'free_credits'

  | 'credit_pack_discount'

  | 'subscription_discount';



export type PromoRedemptionContext =

  | 'signup'

  | 'first_publish'

  | 'credit_checkout'

  | 'subscription_checkout';



export type PromoEligibleProfileRole = 'both' | 'company' | 'individual';



export type PromoDiscountKind = 'percent' | 'amount_off';



export type PromoCodeMode = 'shared' | 'unique_pool';



export type PromoSubscriptionDiscountDuration = 'once' | 'forever' | 'repeating';



export type PromoPoolCodeStatus = 'available' | 'redeemed' | 'disabled';



export type PromoCampaignRow = {

  id: string;

  code: string;

  name: string;

  enabled: boolean;

  max_redemptions: number | null;

  redemption_count: number;

  starts_at: string | null;

  ends_at: string | null;

  reward_type: PromoRewardType;

  reward_credits: number | null;

  reward_percent: number | null;

  discount_kind: PromoDiscountKind | null;

  reward_amount_cents: number | null;

  reward_all_credit_packs: boolean;

  reward_credit_pack_slugs: string[];

  reward_all_subscription_plans: boolean;

  reward_subscription_plan_slugs: string[];

  subscription_discount_duration: PromoSubscriptionDiscountDuration | null;

  subscription_discount_duration_months: number | null;

  stripe_coupon_id: string | null;

  require_new_account: boolean;

  new_account_max_hours: number;

  require_first_publish: boolean;

  require_promo_code: boolean;

  eligible_profile_role: PromoEligibleProfileRole;

  require_no_prior_subscription: boolean;

  require_no_published_offer: boolean;

  code_mode: PromoCodeMode;

  archived_at: string | null;

  created_at: string;

  updated_at: string;

};



export type PromoPoolCodeRow = {

  id: string;

  campaign_id: string;

  code: string;

  status: PromoPoolCodeStatus;

  redeemed_by_user_id: string | null;

  redemption_id: string | null;

  created_at: string;

  redeemed_at: string | null;

};



export type PromoRedemptionRow = {

  id: string;

  campaign_id: string;

  user_id: string;

  context: PromoRedemptionContext;

  status: 'pending' | 'completed' | 'cancelled';

  credits_granted: number | null;

  percent_applied: number | null;

  amount_applied_cents: number | null;

  target_slug: string | null;

  payment_intent_id: string | null;

  stripe_subscription_id: string | null;

  pool_code_id: string | null;

  created_at: string;

  completed_at: string | null;

};



export const PROMO_METADATA_KEY = 'promo_code';

