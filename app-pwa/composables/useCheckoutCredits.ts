import type { CheckoutBillingPayload } from '~/utils/checkout-billing'
import type { PreparePaymentResult } from '~/utils/stripe-prepare-payment'
import { ROUTES } from '~/utils/app-routes'
import {
  filterPurchasableCreditPacks,
  isPurchasableCreditPack,
  type CreditPackRow,
} from '~/utils/credit-packs'
import { S } from '~/utils/strings'
import { stripStripeReturnQueryFromBrowserUrl } from '~/utils/stripe-return-query'

export type CheckoutCreditPack = CreditPackRow & {
  price_id: string
  credits: number
  unit_amount: number
  currency: string
  slug?: string
  name_sk?: string
  badge?: string | null
}

type ProfileBillingPrefill = {
  company_name?: string | null
  registration_number?: string | null
  tax_id?: string | null
  vat_id?: string | null
  registered_office?: string | null
  billing_details?: { address?: string | null } | null
}

export function useCheckoutCredits(options: { packSlug: string; returnPath: string }) {
  const { packSlug, returnPath } = options
  const {
    ensureRecentLoginForBilling,
    billingStepUpUserMessage,
    isStepUpRequiredResponse,
    tryRecoverFromStepUpRequired,
  } = useBillingStepUp()
  const { api } = useApi()
  const { refreshUser } = useAuth()
  const { capture } = useAnalytics()
  const route = useRoute()
  const requestURL = useRequestURL()

  const pack = ref<CheckoutCreditPack | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const clientSecret = ref<string | null>(null)
  const successMessage = ref<string | null>(null)
  const billingPrefill = ref<ProfileBillingPrefill | null>(null)

  const stripeReturnUrl = computed(() => {
    const path = ROUTES.checkoutCredits(packSlug, returnPath)
    if (import.meta.client && typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return `${requestURL.origin}${path}`
  })

  function formatPrice(unitAmount: number, currency: string): string {
    const value = (unitAmount / 100).toFixed(2)
    if (currency.toUpperCase() === 'EUR') return `${value} €`
    return `${value} ${currency}`
  }

  function pricePerCredit(p: CheckoutCreditPack): string {
    const per = p.unit_amount / 100 / p.credits
    return `${per.toFixed(2).replace('.', ',')} € / kredit`
  }

  async function confirmCreditsFromPaymentIntent(
    paymentIntentId: string | null | undefined,
    billing?: CheckoutBillingPayload,
  ): Promise<boolean> {
    try {
      const id = typeof paymentIntentId === 'string' ? paymentIntentId.trim() : ''
      if (!id.startsWith('pi_')) {
        error.value = S.checkoutPaymentNoIntentId
        return false
      }
      const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      error.value = gate.message
      return false
    }
    const body: { payment_intent_id: string; billing?: CheckoutBillingPayload } = {
      payment_intent_id: id,
    }
    if (billing) body.billing = billing
    let res = await api<{ message?: string }>('/api/payments/confirm-credits', {
      method: 'POST',
      body,
    })
    if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {
      res = await api<{ message?: string }>('/api/payments/confirm-credits', {
        method: 'POST',
        body,
      })
    }
    if (!res.ok) {
      error.value = await billingStepUpUserMessage(res)
      return false
    }
    error.value = null
    await refreshUser()
    successMessage.value = S.checkoutCreditsSuccess
    clientSecret.value = null
    capture('credits_purchased', {
      purchaser_type: billing?.purchaser_type,
    })
    await navigateTo(returnPath, { replace: true })
    return true
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : 'Platbu sa nepodarilo dokončiť na serveri.'
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
    await confirmCreditsFromPaymentIntent(pi)
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
    const p = pack.value
    if (!p || !isPurchasableCreditPack(p)) {
      error.value = S.buyCreditsCatalogNotConfigured
      return null
    }
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      error.value = gate.message
      return null
    }
    const body: { price_id: string; billing?: CheckoutBillingPayload } = {
      price_id: p.price_id,
    }
    if (billing) {
      body.billing = billing
    }
    let res = await api<{
      client_secret: string
      amount?: number
      currency?: string
    }>('/api/payments/create-payment-intent-credits', {
      method: 'POST',
      body,
    })
    if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {
      res = await api<{
        client_secret: string
        amount?: number
        currency?: string
      }>('/api/payments/create-payment-intent-credits', {
        method: 'POST',
        body,
      })
    }
    if (!res.ok) {
      error.value = await billingStepUpUserMessage(res)
      return null
    }
    const secret = typeof res.data?.client_secret === 'string' ? res.data.client_secret.trim() : ''
    if (!secret) {
      error.value = S.checkoutNoClientSecret
      return null
    }
    clientSecret.value = secret
    capture('checkout_started', {
      price_id: p.price_id,
      credits: p.credits,
      flow: 'credits',
      purchaser_type: billing?.purchaser_type,
    })
    return {
      clientSecret: secret,
      amount: typeof res.data?.amount === 'number' ? res.data.amount : undefined,
      currency: res.data?.currency?.trim() || undefined,
    }
  }

  async function init(): Promise<void> {
    if (import.meta.client) stripStripeReturnQueryFromBrowserUrl()
    loading.value = true
    error.value = null
    try {
      await loadBillingPrefill()
      const res = await api<CheckoutCreditPack[]>('/api/payments/credit-packs', {})
      if (!res.ok || !Array.isArray(res.data)) {
        error.value = S.checkoutInvalidParams
        return
      }
      const purchasable = filterPurchasableCreditPacks(
        res.data.filter((row) => row.slug !== 'agentura'),
      )
      const found = purchasable.find((row) => row.slug === packSlug)
      if (!found) {
        error.value = S.checkoutInvalidParams
        return
      }
      pack.value = found
      await tryConfirmFromReturnUrl()
    } finally {
      loading.value = false
    }
  }

  return {
    pack,
    loading,
    error,
    clientSecret,
    successMessage,
    billingPrefill,
    stripeReturnUrl,
    formatPrice,
    pricePerCredit,
    confirmCreditsFromPaymentIntent,
    createPaymentIntent,
    init,
  }
}
