import { ROUTES } from '~/utils/app-routes'
import { parseApiErrorMessage } from '~/utils/api-errors'
import { parseSafeApiErrorMessage } from '~/utils/safe-user-messages'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import { stripStripeSecretQueryFromBrowserUrl } from '~/utils/stripe-return-query'
import { S } from '~/utils/strings'

export type CheckoutResultPhase = 'processing' | 'success' | 'failed'

const CREDITS_PENDING_FULFILLMENT_SNIPPET =
  'Kredity z tejto platby ešte nie je možné pripísať'

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableFulfillmentError(message: string): boolean {
  return message.includes(CREDITS_PENDING_FULFILLMENT_SNIPPET)
}

export function useCheckoutResult() {
  const route = useRoute()
  const { ensureRecentLoginForBilling } = useBillingStepUp()
  const { api } = useApi()
  const { refreshUser } = useAuth()
  const { capture } = useAnalytics()

  const phase = ref<CheckoutResultPhase>('processing')
  const message = ref<string>(S.checkoutResultProcessing)
  const pendingIntentId = ref<string | null>(null)
  const pendingIntentKind = ref<'payment' | 'setup' | null>(null)
  const processingStarted = ref(false)

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

  const canRetryFulfillment = computed(
    () => phase.value === 'failed' && !!pendingIntentId.value,
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
    pendingIntentId.value = null
    pendingIntentKind.value = null
    if (import.meta.client) {
      stripStripeSecretQueryFromBrowserUrl()
    }
  }

  async function confirmCreditsOnce(paymentIntentId: string): Promise<boolean> {
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
      const errMsg = parseApiErrorMessage(res, S.checkoutPaymentFailed)
      if (isRetryableFulfillmentError(errMsg)) {
        return false
      }
      fail(errMsg)
      return false
    }
    await refreshUser()
    capture('credits_purchased', {})
    succeed()
    return true
  }

  async function confirmCredits(paymentIntentId: string): Promise<boolean> {
    pendingIntentId.value = paymentIntentId
    pendingIntentKind.value = 'payment'
    phase.value = 'processing'
    message.value = S.checkoutResultProcessing

    const attempts = 6
    for (let attempt = 0; attempt < attempts; attempt++) {
      const ok = await confirmCreditsOnce(paymentIntentId)
      if (ok) return true
      if (phase.value === 'failed') return false
      if (attempt < attempts - 1) {
        await delayMs(900)
      }
    }

    fail(S.checkoutResultChargedPending)
    return false
  }

  async function confirmSubscriptionOnce(intentId: string): Promise<boolean> {
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
      const errMsg = parseSafeApiErrorMessage(res, S.checkoutPaymentFailed)
      if (isRetryableFulfillmentError(errMsg)) {
        return false
      }
      fail(errMsg)
      return false
    }
    await refreshUser()
    capture('subscription_purchased', { plan_id: planId.value || undefined })
    succeed()
    return true
  }

  async function confirmSubscription(intentId: string): Promise<boolean> {
    pendingIntentId.value = intentId
    pendingIntentKind.value = intentId.startsWith('seti_') ? 'setup' : 'payment'
    phase.value = 'processing'
    message.value = S.checkoutResultProcessing

    const attempts = 6
    for (let attempt = 0; attempt < attempts; attempt++) {
      const ok = await confirmSubscriptionOnce(intentId)
      if (ok) return true
      if (phase.value === 'failed') return false
      if (attempt < attempts - 1) {
        await delayMs(900)
      }
    }

    fail(S.checkoutResultChargedPending)
    return false
  }

  async function retryFulfillment(): Promise<void> {
    const id = pendingIntentId.value
    if (!id) return
    if (checkoutType.value === 'credits' && pendingIntentKind.value === 'payment') {
      await confirmCredits(id)
      return
    }
    if (checkoutType.value === 'subscription') {
      await confirmSubscription(id)
    }
  }

  async function processReturn(): Promise<void> {
    if (processingStarted.value) return
    processingStarted.value = true

    const type = checkoutType.value
    if (!type) {
      if (import.meta.client) stripStripeSecretQueryFromBrowserUrl()
      fail(S.checkoutInvalidParams)
      return
    }
    if (type === 'credits' && !packSlug.value) {
      if (import.meta.client) stripStripeSecretQueryFromBrowserUrl()
      fail(S.checkoutInvalidParams)
      return
    }
    if (type === 'subscription' && !planId.value) {
      if (import.meta.client) stripStripeSecretQueryFromBrowserUrl()
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

    if (import.meta.client) stripStripeSecretQueryFromBrowserUrl()

    if (redirectStatus === 'failed') {
      fail(S.checkoutPaymentFailed)
      return
    }

    if (paymentIntent) {
      if (type === 'credits') {
        await confirmCredits(paymentIntent)
      } else {
        await confirmSubscription(paymentIntent)
      }
      return
    }

    if (setupIntent) {
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
    canRetryFulfillment,
    retryFulfillment,
    processReturn,
  }
}
