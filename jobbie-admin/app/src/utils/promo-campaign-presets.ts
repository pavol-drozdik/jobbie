import type { CampaignForm } from './promo-campaign-types'

export type PromoCampaignPreset = {
  id: string
  label: string
  description: string
  defaults: Partial<CampaignForm>
}

export const PROMO_CAMPAIGN_PRESETS: PromoCampaignPreset[] = [
  {
    id: 'launch_signup_credits',
    label: 'Registračné kredity (LAUNCH)',
    description: 'Kredity hneď po registrácii pre nové účty.',
    defaults: {
      name: 'Registračné kredity',
      reward_type: 'free_credits',
      reward_credits: 20,
      grant_timing: 'signup',
      require_new_account: true,
      new_account_max_hours: 48,
      require_first_publish: false,
      unlimitedRedemptions: false,
      max_redemptions: 50,
    },
  },
  {
    id: 'first_listing_bonus',
    label: 'Bonus za prvý inzerát',
    description: 'Kód pri registrácii, kredity po prvom zverejnení ponuky alebo reklamy.',
    defaults: {
      name: 'Bonus za prvý inzerát',
      reward_type: 'free_credits',
      reward_credits: 50,
      grant_timing: 'first_publish',
      require_new_account: true,
      new_account_max_hours: 48,
      require_first_publish: true,
      unlimitedRedemptions: true,
    },
  },
  {
    id: 'checkout_pack_sale',
    label: 'Zľava na balíky kreditov',
    description: 'Percentuálna zľava pri nákupe kreditov v pokladni.',
    defaults: {
      name: 'Zľava na balíky',
      reward_type: 'credit_pack_discount',
      discount_kind: 'percent',
      reward_percent: 10,
      reward_all_credit_packs: true,
      require_new_account: false,
      grant_timing: 'signup',
      unlimitedRedemptions: true,
      unlimitedTime: true,
    },
  },
  {
    id: 'new_user_subscription',
    label: 'Zľava na predplatné (noví)',
    description: 'Zľava na prvú platbu predplatného pre nové účty.',
    defaults: {
      name: 'Zľava na predplatné pre nových',
      reward_type: 'subscription_discount',
      discount_kind: 'percent',
      reward_percent: 50,
      subscription_discount_duration: 'once',
      reward_all_subscription_plans: true,
      require_new_account: true,
      new_account_max_hours: 720,
      require_no_prior_subscription: true,
      unlimitedRedemptions: true,
      unlimitedTime: false,
    },
  },
  {
    id: 'b2b_subscription',
    label: 'Zľava na predplatné (firmy)',
    description: 'Zľava na predplatné len pre firemné účty.',
    defaults: {
      name: 'Zľava na predplatné pre firmy',
      reward_type: 'subscription_discount',
      discount_kind: 'percent',
      reward_percent: 20,
      subscription_discount_duration: 'once',
      reward_all_subscription_plans: true,
      eligible_profile_role: 'company',
      require_new_account: false,
      unlimitedRedemptions: true,
    },
  },
  {
    id: 'influencer_pool',
    label: 'Influencer pool (unikátne kódy)',
    description: 'Bezplatné kredity cez pool jednorazových kódov pre influencerov.',
    defaults: {
      name: 'Influencer pool kredity',
      code_mode: 'unique_pool',
      reward_type: 'free_credits',
      reward_credits: 20,
      grant_timing: 'signup',
      require_new_account: true,
      new_account_max_hours: 168,
      require_first_publish: false,
      unlimitedRedemptions: false,
      max_redemptions: 100,
    },
  },
  {
    id: 'blank',
    label: 'Vlastná kampaň',
    description: 'Prázdna šablóna — nastavíte všetko ručne.',
    defaults: {},
  },
]

export function getPresetById(id: string): PromoCampaignPreset | undefined {
  return PROMO_CAMPAIGN_PRESETS.find((p) => p.id === id)
}
