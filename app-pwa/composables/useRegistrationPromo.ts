export type RegistrationPromoRedeemResult = {
  ok: boolean
  credits_granted?: number
  reason?: string
}

export type PromoAvailability = {
  active?: boolean
  registration?: boolean
  credit_checkout?: boolean
  subscription_checkout?: boolean
  registration_pool_mode?: boolean
}

const PENDING_REGISTRATION_PROMO_KEY = 'jobbie:pending-registration-promo'

export function markPendingRegistrationPromo(code?: string | null): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      PENDING_REGISTRATION_PROMO_KEY,
      code?.trim() ? code.trim() : 'metadata',
    )
  } catch {
    /* ignore */
  }
}

function consumePendingRegistrationPromo(): 'skip' | 'metadata' | string {
  if (!import.meta.client) return 'skip'
  try {
    const raw = sessionStorage.getItem(PENDING_REGISTRATION_PROMO_KEY)
    sessionStorage.removeItem(PENDING_REGISTRATION_PROMO_KEY)
    if (!raw) return 'skip'
    if (raw === 'metadata') return 'metadata'
    return raw
  } catch {
    return 'skip'
  }
}

export function useRegistrationPromo() {
  const promoCode = useState<string>('reg-promo-code', () => '')
  const promoRegistrationAvailable = useState<boolean | null>(
    'reg-promo-registration-available',
    () => null,
  )
  const registrationPoolMode = useState<boolean>(
    'reg-promo-registration-pool-mode',
    () => false,
  )
  const grantedCredits = useState<number | null>('reg-promo-granted', () => null)

  const { api } = useApi()

  async function loadPromoActive(): Promise<boolean> {
    promoRegistrationAvailable.value = null
    registrationPoolMode.value = false
    try {
      const res = await api<PromoAvailability>('/api/promotions/active', {
        skipSessionExpiry: true,
      })
      const registration =
        res.status === 200 && res.data?.registration === true
      promoRegistrationAvailable.value = registration
      registrationPoolMode.value = res.data?.registration_pool_mode === true
      return registration
    } catch {
      promoRegistrationAvailable.value = false
      registrationPoolMode.value = false
      return false
    }
  }

  async function validatePromoCode(code: string): Promise<boolean> {
    const trimmed = code.trim()
    if (!trimmed) return false
    const res = await api<{ valid?: boolean }>('/api/promotions/validate', {
      method: 'POST',
      body: { code: trimmed, context: 'signup' },
      skipSessionExpiry: true,
    })
    return res.status === 200 && res.data?.valid === true
  }

  async function redeemRegistrationPromo(
    codeOverride?: string | null,
    options?: { useMetadataFallback?: boolean },
  ): Promise<RegistrationPromoRedeemResult | null> {
    const trimmed = (codeOverride ?? promoCode.value).trim()
    const body: {
      code?: string
      context: 'signup'
      use_metadata_fallback?: boolean
    } = { context: 'signup' }
    if (trimmed) {
      body.code = trimmed
    } else if (options?.useMetadataFallback) {
      body.use_metadata_fallback = true
    } else {
      return null
    }
    const res = await api<RegistrationPromoRedeemResult>('/api/promotions/redeem', {
      method: 'POST',
      body,
    })
    if (res.status !== 200 || !res.data) {
      return null
    }
    if (res.data.ok && res.data.credits_granted != null) {
      grantedCredits.value = res.data.credits_granted
    }
    return res.data
  }

  async function redeemRegistrationPromoIfSignupEligible(
    codeOverride?: string | null,
    options?: { useMetadataFallback?: boolean },
  ): Promise<RegistrationPromoRedeemResult | null> {
    const trimmed = (codeOverride ?? promoCode.value).trim()
    if (options?.useMetadataFallback) {
      return redeemRegistrationPromo(undefined, { useMetadataFallback: true })
    }
    if (!trimmed) return null
    const validForSignup = await validatePromoCode(trimmed)
    if (!validForSignup) return null
    return redeemRegistrationPromo(trimmed)
  }

  function clearGrantedCreditsBanner(): void {
    grantedCredits.value = null
  }

  async function tryRedeemPendingRegistrationPromo(): Promise<RegistrationPromoRedeemResult | null> {
    if (!import.meta.client) return null
    const pending = consumePendingRegistrationPromo()
    if (pending === 'skip') {
      return null
    }
    if (pending === 'metadata') {
      return redeemRegistrationPromoIfSignupEligible(undefined, {
        useMetadataFallback: true,
      })
    }
    return redeemRegistrationPromoIfSignupEligible(pending)
  }

  return {
    promoCode,
    promoRegistrationAvailable,
    registrationPoolMode,
    /** @deprecated use promoRegistrationAvailable */
    promoActive: promoRegistrationAvailable,
    grantedCredits,
    loadPromoActive,
    validatePromoCode,
    redeemRegistrationPromo,
    redeemRegistrationPromoIfSignupEligible,
    tryRedeemPendingRegistrationPromo,
    markPendingRegistrationPromo,
    clearGrantedCreditsBanner,
  }
}
