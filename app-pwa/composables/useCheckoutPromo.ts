import { useDebouncedFn } from '~/utils/debounce'
import type { PromoAvailability } from '~/composables/useRegistrationPromo'
import { S } from '~/utils/strings'

export type CheckoutPromoPreview = {
  original_cents: number
  discounted_cents: number
  percent_off?: number
  amount_off_cents?: number
  duration_label?: string
}

type CheckoutPromoContext = 'credit_checkout' | 'subscription_checkout'

const PROMO_VALIDATE_REASON_MESSAGES: Record<string, string> = {
  invalid_code: S.checkoutPromoReasonInvalidCode,
  pool_code_invalid: S.checkoutPromoReasonPoolInvalid,
  pool_code_exhausted: S.checkoutPromoReasonPoolExhausted,
  pack_not_eligible: S.checkoutPromoReasonPackNotEligible,
  plan_not_eligible: S.checkoutPromoReasonPlanNotEligible,
  account_too_old: S.checkoutPromoReasonAccountTooOld,
  prior_published_offer: S.checkoutPromoReasonPriorPublished,
  prior_subscription: S.checkoutPromoReasonPriorSubscription,
  wrong_profile_role: S.checkoutPromoReasonWrongProfileRole,
  already_redeemed: S.checkoutPromoReasonAlreadyRedeemed,
  wrong_reward_type: S.checkoutPromoReasonWrongRewardType,
  first_publish_required: S.checkoutPromoReasonFirstPublishRequired,
}

export function promoValidateReasonMessage(reasons?: string[]): string {
  if (!reasons?.length) return S.checkoutPromoInvalidGeneric
  const code = reasons.find((r) => PROMO_VALIDATE_REASON_MESSAGES[r])
  if (!code) return S.checkoutPromoInvalidGeneric
  return PROMO_VALIDATE_REASON_MESSAGES[code]!
}

export function formatPromoAmountOff(cents: number): string {
  return `−${(cents / 100).toFixed(2)} €`
}

export function useCheckoutPromo(options: {
  context: CheckoutPromoContext
  targetSlug: Ref<string | undefined>
  initialPromoCode?: Ref<string | undefined> | string
}) {
  const resolveInitial = () => {
    if (typeof options.initialPromoCode === 'string') {
      return options.initialPromoCode.trim()
    }
    return options.initialPromoCode?.value?.trim() ?? ''
  }

  const promoCode = ref(resolveInitial())
  const promoPreview = ref<CheckoutPromoPreview | null>(null)
  const promoValid = ref(false)
  const promoError = ref<string | null>(null)
  const validating = ref(false)
  const promoCheckoutAvailable = ref(false)
  const availabilityLoaded = ref(false)

  const { api } = useApi()

  watch(
    () =>
      typeof options.initialPromoCode === 'string'
        ? options.initialPromoCode
        : options.initialPromoCode?.value,
    (code) => {
      const trimmed = code?.trim()
      if (trimmed && !promoCode.value.trim()) {
        promoCode.value = trimmed
      }
    },
    { immediate: true },
  )

  async function loadPromoAvailability(): Promise<void> {
    const res = await api<PromoAvailability>('/api/promotions/active', {
      skipSessionExpiry: true,
    })
    availabilityLoaded.value = true
    if (!res.ok || !res.data) {
      promoCheckoutAvailable.value = false
      return
    }
    promoCheckoutAvailable.value =
      options.context === 'credit_checkout'
        ? res.data.credit_checkout === true
        : res.data.subscription_checkout === true
  }

  void loadPromoAvailability()

  async function validatePromo(): Promise<void> {
    const code = promoCode.value.trim()
    if (!code) {
      promoPreview.value = null
      promoValid.value = false
      promoError.value = null
      return
    }
    const slug = options.targetSlug.value?.trim()
    if (!slug) return

    validating.value = true
    promoError.value = null
    const body: Record<string, string> = {
      code,
      context: options.context,
    }
    if (options.context === 'credit_checkout') {
      body.pack_slug = slug
    } else {
      body.plan_slug = slug
    }
    const res = await api<{
      valid?: boolean
      preview?: CheckoutPromoPreview
      reasons?: string[]
    }>('/api/promotions/validate', { method: 'POST', body })
    validating.value = false
    if (!res.ok || !res.data?.valid) {
      promoValid.value = false
      promoPreview.value = null
      promoError.value = promoValidateReasonMessage(res.data?.reasons)
      return
    }
    promoValid.value = true
    promoPreview.value = res.data.preview ?? null
    promoError.value = null
  }

  const debouncedValidate = useDebouncedFn(() => {
    void validatePromo()
  }, 400)

  watch(promoCode, () => {
    debouncedValidate()
  })

  watch(options.targetSlug, () => {
    if (promoCode.value.trim()) {
      debouncedValidate()
    }
  })

  onBeforeUnmount(() => {
    debouncedValidate.cancel()
  })

  const displayCents = computed(() => {
    if (promoValid.value && promoPreview.value) {
      return promoPreview.value.discounted_cents
    }
    if (promoPreview.value?.original_cents != null) {
      return promoPreview.value.original_cents
    }
    return null
  })

  function resolvedPromoCodeForCheckout(): string | undefined {
    const code = promoCode.value.trim()
    return code || undefined
  }

  return {
    promoCode,
    promoPreview,
    promoValid,
    promoError,
    validating,
    promoCheckoutAvailable,
    availabilityLoaded,
    displayCents,
    validatePromo,
    resolvedPromoCodeForCheckout,
    loadPromoAvailability,
  }
}
