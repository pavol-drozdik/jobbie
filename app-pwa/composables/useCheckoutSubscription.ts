import type { PlanRow } from '~/composables/usePlans'
import type { CheckoutBillingPayload } from '~/utils/checkout-billing'
import type { PreparePaymentResult } from '~/utils/stripe-prepare-payment'
import { filterPublicSubscriptionPlans } from '~/utils/pricing-catalog'
import { ROUTES } from '~/utils/app-routes'
import { parseApiErrorMessage } from '~/utils/api-errors'
import { parseSafeApiErrorMessage } from '~/utils/safe-user-messages'
import { stripStripeReturnQueryFromBrowserUrl } from '~/utils/stripe-return-query'
import { resolvePlanTrialDays } from '~/utils/subscription-trial'
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
  const { refreshUser } = useAuth()
  const { capture } = useAnalytics()
  const { load: loadPlansCatalog } = usePlans()
  const { config: billingCatalogConfig, load: loadBillingCatalog } = useCatalogBilling()
  const { account: billingAccount, load: loadBillingAccount } = useBillingAccount()
  const route = useRoute()
  const requestURL = useRequestURL()

  const plan = ref<PlanRow | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const clientSecret = ref<string | null>(null)
  const successMessage = ref<string | null>(null)
  const billingPrefill = ref<ProfileBillingPrefill | null>(null)

  const stripeReturnUrl = computed(() => {
    const path = ROUTES.checkoutPlan(planId, returnPath)
    if (import.meta.client && typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return `${requestURL.origin}${path}`
  })

  function formatPlanPrice(priceCents: number): string {
    if (priceCents === 0) return S.planPriceFree
    return `${(priceCents / 100).toFixed(2)} €${S.planPerMonth}`
  }

  const planTrialDays = computed((): number => {
    if (!plan.value) return 0
    return resolvePlanTrialDays(plan.value, billingCatalogConfig.value)
  })

  /** Trial UI + deferred Setup mode only when this user can actually get a trial. */
  const checkoutTrialDays = computed((): number => {
    if (!billingAccount.value?.subscriptionTrialEligible) return 0
    return planTrialDays.value
  })

  const checkoutUsesSetupDeferred = computed(
    () => checkoutTrialDays.value > 0,
  )

  async function confirmSubscriptionFromPaymentIntent(
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
      const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      error.value = gate.message
      return false
    }
    const body: {
      payment_intent_id?: string
      setup_intent_id?: string
      billing?: CheckoutBillingPayload
    } = isSetup ? { setup_intent_id: id } : { payment_intent_id: id }
    if (billing) body.billing = billing
    const res = await api<{ ok: boolean }>('/api/payments/confirm-subscription', {
      method: 'POST',
      body,
    })
    if (!res.ok) {
      error.value = parseSafeApiErrorMessage(res, S.checkoutPaymentFailed)
      return false
    }
    error.value = null
    await refreshUser()
    successMessage.value =
      checkoutTrialDays.value > 0
        ? S.checkoutSubscriptionTrialSuccess
        : S.checkoutSubscriptionSuccess
    clientSecret.value = null
    capture('subscription_purchased', {
      plan_id: planId,
      purchaser_type: billing?.purchaser_type,
    })
    await navigateTo(returnPath, { replace: true })
    return true
    } catch {
      error.value = S.checkoutPaymentFailed
      return false
    }
  }

  async function clearPaymentQuery(): Promise<void> {
    const q = { ...route.query }
    delete (q as Record<string, unknown>).payment_intent
    delete (q as Record<string, unknown>).payment_intent_client_secret
    delete (q as Record<string, unknown>).redirect_status
    await navigateTo({ path: ROUTES.checkout, query: q }, { replace: true })
  }

  async function tryConfirmFromReturnUrl(): Promise<void> {
    const pi = typeof route.query.payment_intent === 'string' ? route.query.payment_intent.trim() : ''
    if (!pi.startsWith('pi_')) return
    const status = route.query.redirect_status
    if (status === 'failed') {
      error.value = S.checkoutPaymentFailed
      await clearPaymentQuery()
      return
    }
    await confirmSubscriptionFromPaymentIntent(pi)
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
    const body: { plan_id: string; billing?: CheckoutBillingPayload } = {
      plan_id: planId,
    }
    if (billing) {
      body.billing = billing
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
        : null
    capture('checkout_started', {
      plan_id: planId,
      flow: 'subscription',
      purchaser_type: billing?.purchaser_type,
      trial_period_days: trialDays ?? undefined,
    })
    return {
      clientSecret: secret,
      amount: typeof res.data?.amount === 'number' ? res.data.amount : undefined,
      currency: res.data?.currency?.trim() || undefined,
      intentType:
        res.data?.intent_type === 'setup' || res.data?.intent_type === 'payment'
          ? res.data.intent_type
          : undefined,
      trialPeriodDays: trialDays ?? undefined,
    }
  }

  async function init(): Promise<void> {
    if (import.meta.client) {
      stripStripeReturnQueryFromBrowserUrl()
    }
    loading.value = true
    error.value = null
    try {
      await loadBillingPrefill()
      await Promise.all([loadBillingCatalog(), loadBillingAccount()])
      const rows = await loadPlansCatalog()
      const visible = filterPublicSubscriptionPlans(rows)
      const found = visible.find((p) => p.id === planId)
      if (!found || found.price_monthly_cents < 1) {
        error.value = S.checkoutInvalidParams
        return
      }
      plan.value = found
      await tryConfirmFromReturnUrl()
    } finally {
      loading.value = false
    }
  }

  return {
    plan,
    loading,
    error,
    clientSecret,
    successMessage,
    billingPrefill,
    stripeReturnUrl,
    checkoutTrialDays,
    checkoutUsesSetupDeferred,
    planTrialDays,
    formatPlanPrice,
    confirmSubscriptionFromPaymentIntent,
    createPaymentIntent,
    init,
  }
}
