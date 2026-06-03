import type { CompanyAdFormPayload } from '~/utils/company-ad'

const TITLE_MAX = 120

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const PRICE_TYPES_REQUIRING_AMOUNT = ['hourly', 'per_sqm', 'per_project', 'per_unit']

function isOnlineOnly(serviceAreas: string[]): boolean {
  return serviceAreas.includes('online')
}

/** Light validation when advancing wizard steps (not full publish). */
export function validateCompanyAdWizardStep(
  step: number,
  state: CompanyAdFormPayload,
  bodyPlain: string,
): string | null {
  if (step === 0) {
    if (!state.title.trim()) return 'Názov je povinný.'
    if (!state.category) return 'Vyberte kategóriu.'
    if (!bodyPlain.trim()) return 'Popis je povinný.'
    return null
  }
  if (step === 1) {
    if (!isOnlineOnly(state.service_areas)) {
      if (!state.region?.trim()) return 'Kraj je povinný (alebo zvoľte online služby).'
      if (!state.city?.trim()) return 'Mesto je povinné (alebo zvoľte online služby).'
    }
    return null
  }
  return null
}

export function validateCompanyAdForPublish(state: CompanyAdFormPayload): string | null {
  const title = state.title.trim()
  if (!title) return 'Názov je povinný.'
  if (title.length > TITLE_MAX) return `Názov môže mať najviac ${TITLE_MAX} znakov.`

  const bodyPlain = state.body.replace(/<[^>]+>/g, '').trim()
  if (!bodyPlain) return 'Popis je povinný.'

  if (!state.category) return 'Vyberte kategóriu.'

  if (!isOnlineOnly(state.service_areas)) {
    if (!state.region?.trim()) return 'Kraj je povinný (alebo zvoľte online služby).'
    if (!state.city?.trim()) return 'Mesto je povinné (alebo zvoľte online služby).'
  }

  const priceType = state.price_type ?? 'negotiable'
  if (state.price_min != null && state.price_min < 0) return 'Cena od musí byť kladná.'
  if (state.price_max != null && state.price_max < 0) return 'Cena do musí byť kladná.'
  if (
    state.price_min != null &&
    state.price_max != null &&
    state.price_max < state.price_min
  ) {
    return 'Cena do musí byť väčšia alebo rovná cene od.'
  }

  const requiresAmount =
    PRICE_TYPES_REQUIRING_AMOUNT.includes(priceType) &&
    priceType !== 'negotiable' &&
    priceType !== 'hidden' &&
    !state.price_negotiable

  if (requiresAmount && state.price_min == null) {
    return 'Zadajte cenu od alebo zvoľte cenu dohodou.'
  }

  const email = (state.contact_email ?? '').trim()
  const website = (state.website ?? '').trim()

  if (email && !isValidEmail(email)) return 'Neplatný formát e-mailu.'
  if (website && !isValidUrl(website)) return 'Neplatná URL webstránky.'

  return null
}
