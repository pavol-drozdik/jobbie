import type { Campaign } from './promo-campaign-types'



function discountChip(campaign: Campaign): string {

  if (campaign.discount_kind === 'amount_off' && campaign.reward_amount_cents) {

    return `${(campaign.reward_amount_cents / 100).toFixed(0)} € zľava`

  }

  return `${campaign.reward_percent ?? 0}%`

}



export function campaignChips(campaign: Campaign): string[] {

  const chips: string[] = []



  if (campaign.reward_type === 'free_credits') {

    chips.push(`${campaign.reward_credits ?? 0} kr`)

    chips.push('Registrácia')

    chips.push(campaign.require_first_publish ? 'Po 1. inzeráte' : 'Hneď po registrácii')

  } else if (campaign.reward_type === 'credit_pack_discount') {

    chips.push(`${discountChip(campaign)} balíky`)

    chips.push('Pokladňa')

  } else {

    const dur =
      campaign.subscription_discount_duration === 'forever'
        ? 'navždy'
        : campaign.subscription_discount_duration === 'repeating'
          ? `${campaign.subscription_discount_duration_months ?? '?'}× mesiac`
          : '1× platba'

    chips.push(`${discountChip(campaign)} predplatné`)

    chips.push(dur)

    chips.push('Pokladňa')

  }



  if (campaign.eligible_profile_role === 'company') chips.push('Firmy')

  if (campaign.eligible_profile_role === 'individual') chips.push('FO')



  if (campaign.require_new_account) {

    chips.push(`Nový účet ${campaign.new_account_max_hours}h`)

  }



  if (campaign.require_no_prior_subscription) {

    chips.push('1× predplatné')

  }

  if (campaign.require_no_published_offer) {

    chips.push('Bez inzerátu')

  }

  if (campaign.code_mode === 'unique_pool') {
    chips.push('Pool kódov')
    if (campaign.pool_available != null) {
      chips.push(`Pool: ${campaign.pool_available} voľných`)
    }
  }



  if (campaign.archived_at) {

    chips.push('Archivovaná')

  } else if (!campaign.enabled) {

    chips.push('Neaktívna')

  }



  return chips

}

