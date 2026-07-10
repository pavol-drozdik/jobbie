import type { PlanRow } from '~/composables/usePlans'
import type { CheckoutBillingPayload } from '~/utils/checkout-billing'
import { stashCheckoutBillingForIntent } from '~/utils/checkout-billing'
import type { PreparePaymentResult } from '~/utils/stripe-prepare-payment'
import { filterPublicSubscriptionPlans } from '~/utils/pricing-catalog'
import { ROUTES } from '~/utils/app-routes'
import { parseApiErrorMessage } from '~/utils/api-errors'
import { S } from '~/utils/strings'

type ProfileBillingPrefill = {
  company_name?: string | null
  registration_number?: string | null
  tax_id?: string | null
  vat_id?: string | null
  registered_office?: string | null
  billing_details?: { address?: string | null } | null
}

export function useCheckoutSubscription(options: { planId: string; returnPath: string }) {
  const { planId, returnPath } = options
  const { ensureRecentLoginForBilling } = useBillingStepUp()
  const { api } = useApi()
  const { capture } = useAnalytics()
  const { load: loadPlansCatalog } = usePlans()
  const { load: loadBillingAccount } = useBillingAccount()
  const requestURL = useRequestURL()

  const plan = ref<PlanRow | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const clientSecret = ref<string | null>(null)
  const billingPrefill = ref<ProfileBillingPrefill | null>(null)
  const planSlugRef = computed(() => planId)
  const route = useRoute()
  const initialPromoCode = computed(() => {
    const raw = route.query.promo
    return typeof raw === 'string' ? raw.trim() : ''
  })
  const {
    promoCode,
    promoPreview,
    promoError,
    validating: promoValidating,
    promoCheckoutAvailable,
    displayCents,
    resolvedPromoCodeForCheckout,
  } = useCheckoutPromo({
    context: 'subscription_checkout',
    targetSlug: planSlugRef,
    initialPromoCode,
  })
  /** Frozen on init from GET /api/payments/subscription-checkout-preview — not updated during pay. */
  const checkoutTrialDays = ref(0)
  const checkoutIntentType = ref<'payment' | 'setup'>('payment')

  const stripeReturnUrl = computed(() => {
    const path = ROUTES.checkoutResultUrl({
      type: 'subscription',
      planId,
      returnPath,
      trial: checkoutTrialDays.value > 0,
    })
    if (import.meta.client && typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return `${requestURL.origin}${path}`
  })

  function formatPlanPrice(priceCents: number): string {
    if (priceCents === 0) return S.planPriceFree
    return `${(priceCents / 100).toFixed(2)} €${S.planPerMonth}`
  }

  const checkoutUsesSetupDeferred = computed(
    () => checkoutIntentType.value === 'setup',
  )

  async function loadCheckoutPreview(): Promise<void> {
    const res = await api<{
      trial_period_days?: number
      intent_type?: 'payment' | 'setup'
    }>('/api/payments/subscription-checkout-preview', {
      query: { plan_id: planId },
    })
    if (!res.ok) {
      checkoutTrialDays.value = 0
      checkoutIntentType.value = 'payment'
      return
    }
    const days =
      typeof res.data?.trial_period_days === 'number' && res.data.trial_period_days > 0
        ? res.data.trial_period_days
        : 0
    checkoutTrialDays.value = days
    checkoutIntentType.value =
      res.data?.intent_type === 'setup' || days > 0 ? 'setup' : 'payment'
  }

  async function navigateToCheckoutResult(
    intentId: string | null | undefined,
    billing?: CheckoutBillingPayload,
  ): Promise<boolean> {
    try {
      const id = typeof intentId === 'string' ? intentId.trim() : ''
      const isPayment = id.startsWith('pi_')
      const isSetup = id.startsWith('seti_')
      if (!isPayment && !isSetup) {
        error.value = S.checkoutPaymentNoIntentId
        return false
      }
      if (billing) {
        stashCheckoutBillingForIntent(id, billing)
      }
      clientSecret.value = null
      await navigateTo(
        ROUTES.checkoutResultUrl({
          type: 'subscription',
          planId,
          returnPath,
          trial: checkoutTrialDays.value > 0,
          ...(isSetup ? { setupIntentId: id } : { paymentIntentId: id }),
        }),
        { replace: true },
      )
      return true
    } catch {
      error.value = S.checkoutPaymentFailed
      return false
    }
  }

  async function loadBillingPrefill(): Promise<void> {
    const res = await api<ProfileBillingPrefill>('/api/profiles/me', {})
    if (res.ok && res.data) {
      billingPrefill.value = {
        company_name: res.data.company_name ?? null,
        registration_number: res.data.registration_number ?? null,
        tax_id: res.data.tax_id ?? null,
        vat_id: res.data.vat_id ?? null,
        registered_office: res.data.registered_office ?? null,
        billing_details: res.data.billing_details ?? null,
      }
    }
  }

  async function createPaymentIntent(
    billing?: CheckoutBillingPayload,
  ): Promise<PreparePaymentResult | null> {
    if (!plan.value) return null
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      error.value = gate.message
      return null
    }
    await loadBillingAccount(true)
    const body: {
      plan_id: string
      billing?: CheckoutBillingPayload
      promo_code?: string
    } = {
      plan_id: planId,
    }
    if (billing) {
      body.billing = billing
    }
    const promo = resolvedPromoCodeForCheckout()
    if (promo) {
      body.promo_code = promo
    }
    const res = await api<{
      client_secret: string
      amount?: number
      currency?: string
      intent_type?: 'payment' | 'setup'
      trial_period_days?: number
    }>('/api/payments/create-payment-intent-subscription', {
      method: 'POST',
      body,
    })
    if (!res.ok) {
      error.value = parseApiErrorMessage(res, S.checkoutPaymentFailed)
      return null
    }
    const secret = typeof res.data?.client_secret === 'string' ? res.data.client_secret.trim() : ''
    if (!secret) {
      error.value = S.checkoutNoClientSecret
      return null
    }
    clientSecret.value = secret
    const trialDays =
      typeof res.data?.trial_period_days === 'number' && res.data.trial_period_days > 0
        ? res.data.trial_period_days
        : 0
    capture('checkout_started', {
      plan_id: planId,
      flow: 'subscription',
      purchaser_type: billing?.purchaser_type,
      trial_period_days: trialDays > 0 ? trialDays : undefined,
    })
    return {
      clientSecret: secret,
      amount: typeof res.data?.amount === 'number' ? res.data.amount : undefined,
      currency: res.data?.currency?.trim() || undefined,
      intentType:
        res.data?.intent_type === 'setup' || res.data?.intent_type === 'payment'
          ? res.data.intent_type
          : undefined,
      trialPeriodDays: trialDays > 0 ? trialDays : undefined,
    }
  }

  async function init(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await loadBillingPrefill()
      await loadBillingAccount()
      const rows = await loadPlansCatalog()
      const visible = filterPublicSubscriptionPlans(rows)
      const found = visible.find((p) => p.id === planId)
      if (!found || found.price_monthly_cents < 1) {
        error.value = S.checkoutInvalidParams
        return
      }
      plan.value = found
      await loadCheckoutPreview()
    } finally {
      loading.value = false
    }
  }

  const checkoutAmountCents = computed(() => {
    if (displayCents.value != null) return displayCents.value
    return plan.value?.price_monthly_cents ?? 0
  })

  return {
    plan,
    loading,
    error,
    clientSecret,
    billingPrefill,
    stripeReturnUrl,
    checkoutTrialDays,
    checkoutIntentType,
    checkoutUsesSetupDeferred,
    promoCode,
    promoPreview,
    promoError,
    promoValidating,
    promoCheckoutAvailable,
    checkoutAmountCents,
    formatPlanPrice,
    navigateToCheckoutResult,
    createPaymentIntent,
    init,
  }
}
