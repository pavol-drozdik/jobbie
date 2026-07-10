export type RewardType = 'free_credits' | 'credit_pack_discount' | 'subscription_discount'

export type DiscountDuration = 'once' | 'forever' | 'repeating'

export type CodeMode = 'shared' | 'unique_pool'

export type GrantTiming = 'signup' | 'first_publish'

export type DiscountKind = 'percent' | 'amount_off'

export type EligibleProfileRole = 'both' | 'company' | 'individual'

export type CampaignForm = {
  code: string
  name: string
  enabled: boolean
  code_mode: CodeMode
  unlimitedRedemptions: boolean
  max_redemptions: number
  unlimitedTime: boolean
  starts_at: string
  ends_at: string
  reward_type: RewardType
  reward_credits: number
  discount_kind: DiscountKind
  reward_percent: number
  reward_amount_cents: number
  reward_all_credit_packs: boolean
  reward_credit_pack_slugs: string[]
  reward_all_subscription_plans: boolean
  reward_subscription_plan_slugs: string[]
  subscription_discount_duration: DiscountDuration
  subscription_discount_duration_months: number
  grant_timing: GrantTiming
  require_new_account: boolean
  new_account_max_hours: number
  require_first_publish: boolean
  require_promo_code: boolean
  eligible_profile_role: EligibleProfileRole
  require_no_prior_subscription: boolean
  require_no_published_offer: boolean
}

export type Campaign = {
  id: string
  code: string
  name: string
  enabled: boolean
  code_mode?: CodeMode
  max_redemptions: number | null
  redemption_count: number
  starts_at: string | null
  ends_at: string | null
  reward_type: RewardType
  reward_credits: number | null
  discount_kind: DiscountKind | null
  reward_percent: number | null
  reward_amount_cents: number | null
  reward_all_credit_packs: boolean
  reward_credit_pack_slugs: string[]
  reward_all_subscription_plans: boolean
  reward_subscription_plan_slugs: string[]
  subscription_discount_duration: DiscountDuration | null
  subscription_discount_duration_months?: number | null
  require_new_account: boolean
  new_account_max_hours: number
  require_first_publish: boolean
  require_promo_code: boolean
  eligible_profile_role: EligibleProfileRole
  require_no_prior_subscription: boolean
  require_no_published_offer: boolean
  archived_at: string | null
  pool_available?: number
  pool_redeemed?: number
}

export type PromoPoolCode = {
  id: string
  code: string
  status: string
  redeemed_at: string | null
  created_at: string
}

export type CampaignRedemption = {
  id: string
  user_id: string
  user_label: string
  user_role: string | null
  context: string
  status: string
  credits_granted: number | null
  percent_applied: number | null
  amount_applied_cents: number | null
  target_slug: string | null
  created_at: string
  completed_at: string | null
  pool_code: string | null
}

export type CampaignWarning = {
  message: string
  blocking: boolean
}

export type CatalogPack = {
  slug: string
  name_sk: string
  credits: number
}

export type CatalogPlan = {
  slug: string
  name_sk: string
}
