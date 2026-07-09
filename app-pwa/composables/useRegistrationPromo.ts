export type RegistrationPromoRedeemResult = {
  ok: boolean
  credits_granted?: number
  reason?: string
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
  const promoActive = useState<boolean | null>('reg-promo-active', () => null)
  const grantedCredits = useState<number | null>('reg-promo-granted', () => null)

  const { api } = useApi()

  async function loadPromoActive(): Promise<boolean> {
    try {
      const res = await api<{ active?: boolean }>('/api/promotions/registration/status', {
        skipSessionExpiry: true,
      })
      const active = res.status === 200 && res.data?.active === true
      promoActive.value = active
      return active
    } catch {
      promoActive.value = false
      return false
    }
  }

  async function validatePromoCode(code: string): Promise<boolean> {
    const trimmed = code.trim()
    if (!trimmed) return false
    const res = await api<{ valid?: boolean }>('/api/promotions/registration/validate', {
      method: 'POST',
      body: { code: trimmed },
      skipSessionExpiry: true,
    })
    return res.status === 200 && res.data?.valid === true
  }

  async function redeemRegistrationPromo(
    codeOverride?: string | null,
    options?: { useMetadataFallback?: boolean },
  ): Promise<RegistrationPromoRedeemResult | null> {
    const trimmed = (codeOverride ?? promoCode.value).trim()
    const body: { code?: string; use_metadata_fallback?: boolean } = {}
    if (trimmed) {
      body.code = trimmed
    } else if (options?.useMetadataFallback) {
      body.use_metadata_fallback = true
    } else {
      return null
    }
    const res = await api<RegistrationPromoRedeemResult>(
      '/api/promotions/registration/redeem',
      {
        method: 'POST',
        body,
      },
    )
    if (res.status !== 200 || !res.data) {
      return null
    }
    if (res.data.ok && res.data.credits_granted != null) {
      grantedCredits.value = res.data.credits_granted
    }
    return res.data
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
      return redeemRegistrationPromo(undefined, { useMetadataFallback: true })
    }
    return redeemRegistrationPromo(pending)
  }

  return {
    promoCode,
    promoActive,
    grantedCredits,
    loadPromoActive,
    validatePromoCode,
    redeemRegistrationPromo,
    tryRedeemPendingRegistrationPromo,
    markPendingRegistrationPromo,
    clearGrantedCreditsBanner,
  }
}
