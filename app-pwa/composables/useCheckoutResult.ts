import { ROUTES } from '~/utils/app-routes'
import { parseApiErrorMessage } from '~/utils/api-errors'
import { parseSafeApiErrorMessage } from '~/utils/safe-user-messages'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import { stripStripeReturnQueryFromBrowserUrl } from '~/utils/stripe-return-query'
import { S } from '~/utils/strings'

export type CheckoutResultPhase = 'processing' | 'success' | 'failed'

export function useCheckoutResult() {
  const route = useRoute()
  const { ensureRecentLoginForBilling } = useBillingStepUp()
  const { api } = useApi()
  const { refreshUser } = useAuth()
  const { capture } = useAnalytics()

  const phase = ref<CheckoutResultPhase>('processing')
  const message = ref<string>(S.checkoutResultProcessing)

  const checkoutType = computed(() => {
    const t = route.query.type
    return t === 'credits' || t === 'subscription' ? t : null
  })

  const packSlug = computed(() =>
    typeof route.query.pack === 'string' ? route.query.pack.trim() : '',
  )

  const planId = computed(() =>
    typeof route.query.plan_id === 'string' ? route.query.plan_id.trim() : '',
  )

  const isTrial = computed(() => {
    const raw = route.query.trial
    const s = Array.isArray(raw) ? raw[0] : raw
    return s === '1' || s === 'true'
  })

  const returnPath = computed(() => {
    const raw = route.query.return
    const s = Array.isArray(raw) ? raw[0] : raw
    return resolveSafeInternalPath(s, ROUTES.pricing)
  })

  const retryCheckoutPath = computed(() => {
    if (checkoutType.value === 'credits' && packSlug.value) {
      return ROUTES.checkoutCredits(packSlug.value, returnPath.value)
    }
    if (checkoutType.value === 'subscription' && planId.value) {
      return ROUTES.checkoutPlan(planId.value, returnPath.value)
    }
    return ROUTES.pricing
  })

  const returnLabel = computed(() =>
    returnPath.value === ROUTES.pricing ? S.checkoutResultBackToPricing : S.checkoutResultContinueCta,
  )

  function resolveSuccessMessage(): string {
    if (checkoutType.value === 'credits') return S.checkoutCreditsSuccess
    if (isTrial.value) return S.checkoutSubscriptionTrialSuccess
    return S.checkoutSubscriptionSuccess
  }

  function fail(msg: string): void {
    phase.value = 'failed'
    message.value = msg
  }

  function succeed(msg?: string): void {
    phase.value = 'success'
    message.value = msg ?? resolveSuccessMessage()
  }

  async function confirmCredits(paymentIntentId: string): Promise<boolean> {
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      fail(gate.message)
      return false
    }
    const res = await api<{ message?: string }>('/api/payments/confirm-credits', {
      method: 'POST',
      body: { payment_intent_id: paymentIntentId },
    })
    if (!res.ok) {
      fail(parseApiErrorMessage(res, S.checkoutPaymentFailed))
      return false
    }
    await refreshUser()
    capture('credits_purchased', {})
    succeed()
    return true
  }

  async function confirmSubscription(intentId: string): Promise<boolean> {
    const isSetup = intentId.startsWith('seti_')
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      fail(gate.message)
      return false
    }
    const body = isSetup
      ? { setup_intent_id: intentId }
      : { payment_intent_id: intentId }
    const res = await api<{ ok: boolean }>('/api/payments/confirm-subscription', {
      method: 'POST',
      body,
    })
    if (!res.ok) {
      fail(parseSafeApiErrorMessage(res, S.checkoutPaymentFailed))
      return false
    }
    await refreshUser()
    capture('subscription_purchased', { plan_id: planId.value || undefined })
    succeed()
    return true
  }

  async function processReturn(): Promise<void> {
    const type = checkoutType.value
    if (!type) {
      if (import.meta.client) stripStripeReturnQueryFromBrowserUrl()
      fail(S.checkoutInvalidParams)
      return
    }
    if (type === 'credits' && !packSlug.value) {
      if (import.meta.client) stripStripeReturnQueryFromBrowserUrl()
      fail(S.checkoutInvalidParams)
      return
    }
    if (type === 'subscription' && !planId.value) {
      if (import.meta.client) stripStripeReturnQueryFromBrowserUrl()
      fail(S.checkoutInvalidParams)
      return
    }

    const redirectStatus =
      typeof route.query.redirect_status === 'string' ? route.query.redirect_status.trim() : null

    const paymentIntent =
      typeof route.query.payment_intent === 'string' &&
      route.query.payment_intent.trim().startsWith('pi_')
        ? route.query.payment_intent.trim()
        : null

    const setupIntent =
      typeof route.query.setup_intent === 'string' &&
      route.query.setup_intent.trim().startsWith('seti_')
        ? route.query.setup_intent.trim()
        : null

    if (import.meta.client) stripStripeReturnQueryFromBrowserUrl()

    if (redirectStatus === 'failed') {
      fail(S.checkoutPaymentFailed)
      return
    }

    if (paymentIntent) {
      phase.value = 'processing'
      message.value = S.checkoutResultProcessing
      if (type === 'credits') {
        await confirmCredits(paymentIntent)
      } else {
        await confirmSubscription(paymentIntent)
      }
      return
    }

    if (setupIntent) {
      phase.value = 'processing'
      message.value = S.checkoutResultProcessing
      await confirmSubscription(setupIntent)
      return
    }

    const status = route.query.status
    if (status === 'success') {
      succeed()
      return
    }

    if (status === 'failed') {
      fail(S.checkoutPaymentFailed)
      return
    }

    fail(S.checkoutInvalidParams)
  }

  onMounted(() => {
    void processReturn()
  })

  return {
    phase,
    message,
    checkoutType,
    returnPath,
    retryCheckoutPath,
    returnLabel,
    processReturn,
  }
}
