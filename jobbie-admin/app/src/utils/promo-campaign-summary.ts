import type { CampaignForm, CampaignWarning } from './promo-campaign-types'



function parseLocalDate(value: string): Date | null {

  const trimmed = value.trim()

  if (!trimmed) return null

  const d = new Date(trimmed)

  return Number.isNaN(d.getTime()) ? null : d

}



function formatDiscountLabel(form: CampaignForm): string {

  if (form.discount_kind === 'amount_off') {

    const euros = (form.reward_amount_cents / 100).toFixed(2)

    return `${euros} € zľava`

  }

  return `${form.reward_percent}% zľava`

}



function formatRoleLabel(role: CampaignForm['eligible_profile_role']): string | null {

  if (role === 'company') return 'len firmy'

  if (role === 'individual') return 'len fyzické osoby'

  return null

}



export function buildCampaignSummary(form: CampaignForm): string[] {

  const lines: string[] = []



  if (form.reward_type === 'free_credits') {

    lines.push(`Odmena: ${form.reward_credits} kreditov zadarmo`)

    lines.push('Kód: pri registrácii')

    lines.push(

      form.grant_timing === 'first_publish'

        ? 'Uplatnenie: po prvom zverejnení inzerátu'

        : 'Uplatnenie: hneď po registrácii',

    )

  } else if (form.reward_type === 'credit_pack_discount') {

    const scope = form.reward_all_credit_packs

      ? 'všetky balíky kreditov'

      : form.reward_credit_pack_slugs.join(', ') || '(žiadne vybrané)'

    lines.push(`Odmena: ${formatDiscountLabel(form)} na ${scope}`)

    lines.push('Kód: pri platbe za kredity')

    lines.push('Uplatnenie: pri dokončení platby')

  } else {

    const scope = form.reward_all_subscription_plans

      ? 'všetky plány'

      : form.reward_subscription_plan_slugs.join(', ') || '(žiadne vybrané)'

    const dur =
      form.subscription_discount_duration === 'forever'
        ? 'všetky opakované platby'
        : form.subscription_discount_duration === 'repeating'
          ? `opakovaná zľava ${form.subscription_discount_duration_months} mesiacov`
          : 'len prvá platba'

    lines.push(`Odmena: ${formatDiscountLabel(form)} na ${scope} (${dur})`)

    lines.push('Kód: pri platbe za predplatné')

    lines.push('Uplatnenie: pri vytvorení predplatného')

  }



  const eligibility: string[] = []

  const roleLabel = formatRoleLabel(form.eligible_profile_role)

  if (roleLabel) eligibility.push(roleLabel)

  if (form.require_new_account) {

    eligibility.push(`nový účet (max. ${form.new_account_max_hours} h)`)

  }

  if (form.require_no_prior_subscription) {

    eligibility.push('len prvé predplatné')

  }

  if (form.require_no_published_offer) {

    eligibility.push('bez zverejneného inzerátu')

  }

  if (form.reward_type === 'free_credits' && form.grant_timing === 'first_publish') {

    eligibility.push('musí mať zverejnený inzerát pri uplatnení')

  }

  lines.push(

    eligibility.length > 0

      ? `Oprávnenosť: ${eligibility.join(' + ')}`

      : 'Oprávnenosť: bez špeciálnych podmienok',

  )



  if (form.unlimitedRedemptions) {

    lines.push('Limit uplatnení: neobmedzený')

  } else {

    lines.push(`Limit uplatnení: max. ${form.max_redemptions}`)

  }



  if (form.unlimitedTime) {

    lines.push('Čas: bez obmedzenia')

  } else {

    lines.push(`Čas: ${form.starts_at || '?'} → ${form.ends_at || '?'}`)

  }



  lines.push(`Stav: ${form.enabled ? 'aktívna' : 'neaktívna (nevytvorí sa automaticky)'}`)

  if (form.code_mode === 'unique_pool') {
    lines.push('Režim kódu: pool unikátnych kódov (pole Kód je len interný názov)')
  } else {
    lines.push('Režim kódu: zdieľaný kód')
  }

  return lines

}



export function buildCampaignWarnings(
  form: CampaignForm,
  editingSavedCampaign = false,
): CampaignWarning[] {

  const warnings: CampaignWarning[] = []



  if (

    form.reward_type === 'free_credits' &&

    form.grant_timing === 'first_publish' &&

    form.require_new_account

  ) {

    warnings.push({

      blocking: false,

      message:

        'Vek účtu sa overuje pri uplatnení (po zverejnení), nie pri registrácii. Ak používateľ zverejní neskôr ako ' +

        `${form.new_account_max_hours} h, kampaň zlyhá.`,

    })

  }



  if (form.reward_type !== 'free_credits' && form.require_first_publish) {

    warnings.push({

      blocking: true,

      message: 'Prvé zverejnenie platí len pre kampane s bezplatnými kreditmi.',

    })

  }



  if (form.require_no_prior_subscription && form.reward_type !== 'subscription_discount') {

    warnings.push({

      blocking: true,

      message: 'Podmienka prvého predplatného platí len pre zľavy na predplatné.',

    })

  }

  if (form.require_no_published_offer && form.reward_type === 'free_credits') {

    warnings.push({

      blocking: true,

      message: 'Podmienka bez zverejneného inzerátu platí len pre zľavy v pokladni.',

    })

  }



  if (

    form.reward_type !== 'free_credits' &&

    form.discount_kind === 'percent' &&

    !form.reward_percent

  ) {

    warnings.push({

      blocking: true,

      message: 'Zadajte percentuálnu zľavu.',

    })

  }



  if (

    form.reward_type !== 'free_credits' &&

    form.discount_kind === 'amount_off' &&

    !form.reward_amount_cents

  ) {

    warnings.push({

      blocking: true,

      message: 'Zadajte pevnú sumu zľavy v centoch (napr. 500 = 5 €).',

    })

  }



  if (

    form.reward_type === 'credit_pack_discount' &&

    !form.reward_all_credit_packs &&

    form.reward_credit_pack_slugs.length === 0

  ) {

    warnings.push({

      blocking: true,

      message: 'Vyberte aspoň jeden balík kreditov alebo zapnite „Všetky balíky“.',

    })

  }



  if (

    form.reward_type === 'subscription_discount' &&

    !form.reward_all_subscription_plans &&

    form.reward_subscription_plan_slugs.length === 0

  ) {

    warnings.push({

      blocking: true,

      message: 'Vyberte aspoň jeden plán alebo zapnite „Všetky plány“.',

    })

  }



  if (!form.unlimitedTime) {

    const start = parseLocalDate(form.starts_at)

    const end = parseLocalDate(form.ends_at)

    if (start && end && end.getTime() <= start.getTime()) {

      warnings.push({

        blocking: true,

        message: 'Koniec kampane musí byť po začiatku.',

      })

    }

  }



  if (!form.enabled && form.unlimitedRedemptions && form.unlimitedTime) {

    warnings.push({

      blocking: false,

      message: 'Kampaň je neaktívna — používatelia ju neuvidia, kým ju nezapnete.',

    })

  }

  if (
    form.reward_type === 'subscription_discount' &&
    form.subscription_discount_duration === 'repeating' &&
    (!form.subscription_discount_duration_months ||
      form.subscription_discount_duration_months < 1 ||
      form.subscription_discount_duration_months > 36)
  ) {
    warnings.push({
      blocking: true,
      message: 'Pre opakovanú zľavu zadajte počet mesiacov (1–36).',
    })
  }

  if (form.code_mode === 'unique_pool' && !editingSavedCampaign) {
    warnings.push({
      blocking: false,
      message:
        'Po uložení kampane vygenerujte kódy v poole — používatelia zadávajú len vygenerované kódy.',
    })
  }

  return warnings
}



export function getBlockingWarnings(
  form: CampaignForm,
  editingSavedCampaign = false,
): CampaignWarning[] {

  return buildCampaignWarnings(form, editingSavedCampaign).filter((w) => w.blocking)

}



export const SIMULATE_REASON_LABELS: Record<string, string> = {

  inactive: 'Kampaň nie je aktívna alebo je mimo časového okna.',

  exhausted: 'Kampaň dosiahla maximálny počet uplatnení.',

  promo_code_required: 'Chýba promo kód.',

  invalid_code: 'Neplatný promo kód.',

  wrong_reward_type: 'Typ odmeny nezodpovedá kontextu uplatnenia.',

  pack_not_eligible: 'Balík kreditov nie je v rozsahu kampane.',

  plan_not_eligible: 'Plán predplatného nie je v rozsahu kampane.',

  already_redeemed: 'Používateľ už túto kampaň uplatnil.',

  account_too_old: 'Účet je príliš starý pre podmienku nového účtu.',

  first_publish_required: 'Vyžaduje sa zverejnený inzerát.',

  wrong_profile_role: 'Typ účtu nezodpovedá podmienkam kampane.',

  prior_subscription: 'Používateľ už mal predplatné.',

  prior_published_offer: 'Účet už má zverejnený inzerát alebo inzerciu.',

  pool_code_invalid: 'Neplatný promo kód z poolu (interný názov kampane nie je platný kód).',

  pool_code_exhausted: 'Promo kód z poolu už bol použitý alebo nie je dostupný.',

}



export function formatSimulateReasons(reasons: string[]): string[] {

  return reasons.map((r) => SIMULATE_REASON_LABELS[r] ?? r)

}

