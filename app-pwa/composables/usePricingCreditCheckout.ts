import { ROUTES } from '~/utils/app-routes'
import {
  filterPurchasableCreditPacks,
  isPurchasableCreditPack,
  type CreditPackRow,
} from '~/utils/credit-packs'
import { S } from '~/utils/strings'

export type PricingCreditPack = CreditPackRow & {
  price_id: string
  credits: number
  unit_amount: number
  currency: string
  slug?: string
  name_sk?: string
  badge?: string | null
}

export function usePricingCreditCheckout(options: {
  returnBasePath: string
  publicMode?: boolean
  embedded?: boolean
  onCreditsPurchased?: () => void
}) {
  const { returnBasePath, publicMode = false, embedded = false, onCreditsPurchased } = options

  const { requireEmployerCheckout } = usePricingCheckout(returnBasePath)
  const {
    ensureRecentLoginForBilling,
    billingStepUpUserMessage,
    isStepUpRequiredResponse,
    tryRecoverFromStepUpRequired,
  } = useBillingStepUp()
  const { api } = useApi()
  const { refreshUser, session } = useAuth()
  const { capture } = useAnalytics()
  const route = useRoute()
  const requestURL = useRequestURL()

  const packs = ref<PricingCreditPack[]>([])
  const packsLoading = ref(true)
  const packsLoadError = ref<string | null>(null)
  const selectedPack = ref<PricingCreditPack | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const successMessage = ref<string | null>(null)
  const clientSecret = ref<string | null>(null)

  const returnUrl = computed(() => {
    const path = publicMode
      ? returnBasePath
      : embedded
        ? `${ROUTES.profile}?tab=buy-credits`
        : '/app/buy-credits'
    if (import.meta.client && typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return `${requestURL.origin}${path}`
  })

  function packBadgeLabel(pack: PricingCreditPack): string | null {
    if (pack.badge === 'popular') return 'Najpopulárnejšie'
    if (pack.badge === 'value') return 'Výhodné'
    return null
  }

  function pricePerCredit(pack: PricingCreditPack): string {
    const per = pack.unit_amount / 100 / pack.credits
    return `${per.toFixed(2).replace('.', ',')} € / kredit`
  }

  function formatPrice(unitAmount: number, currency: string): string {
    const value = (unitAmount / 100).toFixed(2)
    if (currency.toUpperCase() === 'EUR') return `${value} €`
    return `${value} ${currency}`
  }

  async function clearQueryAfterCreditReturn(): Promise<void> {
    const path = publicMode ? returnBasePath : embedded ? ROUTES.profile : '/app/buy-credits'
    const q = { ...route.query }
    delete (q as Record<string, unknown>).payment_intent
    delete (q as Record<string, unknown>).payment_intent_client_secret
    delete (q as Record<string, unknown>).redirect_status
    if (embedded) {
      q.tab = 'buy-credits'
    }
    await navigateTo({ path, query: q }, { replace: true })
  }

  async function confirmCreditsFromPaymentIntent(
    paymentIntentId: string | null | undefined,
  ): Promise<boolean> {
    const id = typeof paymentIntentId === 'string' ? paymentIntentId.trim() : ''
    if (!id.startsWith('pi_')) return false
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      error.value = gate.message
      return false
    }
    let res = await api<{ message?: string }>('/api/payments/confirm-credits', {
      method: 'POST',
      body: { payment_intent_id: id },
    })
    if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {
      res = await api<{ message?: string }>('/api/payments/confirm-credits', {
        method: 'POST',
        body: { payment_intent_id: id },
      })
    }
    if (!res.ok) {
      error.value = await billingStepUpUserMessage(res)
      return false
    }
    error.value = null
    await refreshUser()
    successMessage.value = 'Kredity boli úspešne pripísané na váš účet.'
    clientSecret.value = null
    onCreditsPurchased?.()
    capture('credits_purchased', { payment_intent_id: id })
    await clearQueryAfterCreditReturn()
    return true
  }

  async function onPaymentSuccess(paymentIntentId?: string): Promise<void> {
    if (paymentIntentId) {
      await confirmCreditsFromPaymentIntent(paymentIntentId)
    }
  }

  function isOnCreditsRoute(): boolean {
    if (route.path === ROUTES.checkout) return false
    if (publicMode) return route.path === returnBasePath
    if (embedded) return route.query.tab === 'buy-credits'
    return route.path === '/app/buy-credits'
  }

  async function tryConfirmFromReturnUrl(): Promise<void> {
    if (!isOnCreditsRoute()) return
    const q = route.query
    const pi = typeof q.payment_intent === 'string' ? q.payment_intent.trim() : ''
    if (!pi.startsWith('pi_')) return
    const status = q.redirect_status
    if (status === 'failed') {
      error.value = 'Platba nebola dokončená.'
      await clearQueryAfterCreditReturn()
      return
    }
    await confirmCreditsFromPaymentIntent(pi)
  }

  async function loadPacks(): Promise<void> {
    packsLoadError.value = null
    try {
      const res = await api<PricingCreditPack[]>('/api/payments/credit-packs', {})
      if (!res.ok) {
        packsLoadError.value = `Chyba: ${res.body?.slice(0, 120) ?? 'Unknown'}`
        return
      }
      if (res.data && Array.isArray(res.data)) {
        const purchasable = filterPurchasableCreditPacks(
          res.data.filter((p) => p.slug !== 'agentura'),
        )
        packs.value = purchasable
        if (purchasable.length === 0 && res.data.length > 0) {
          packsLoadError.value = S.buyCreditsCatalogNotConfigured
        }
        const popular = purchasable.find((p) => p.badge === 'popular')
        selectedPack.value = popular ?? (purchasable.length > 0 ? purchasable[0] : null)
      }
    } finally {
      packsLoading.value = false
    }
  }

  async function navigateToCheckout(pack: PricingCreditPack): Promise<void> {
    if (!pack.slug) {
      error.value = S.checkoutInvalidParams
      return
    }
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      error.value = gate.message
      return
    }
    capture('checkout_started', {
      price_id: pack.price_id,
      credits: pack.credits,
    })
    await navigateTo(ROUTES.checkoutCredits(pack.slug, returnBasePath))
  }

  async function executeBuy(): Promise<void> {
    const pack = selectedPack.value ?? packs.value[0]
    if (!pack || !isPurchasableCreditPack(pack)) {
      error.value = packs.value.length === 0 ? S.buyCreditsCatalogNotConfigured : S.buyCreditsNoPacks
      return
    }
    loading.value = true
    error.value = null
    try {
      await navigateToCheckout(pack)
    } finally {
      loading.value = false
    }
  }

  function selectAndBuy(pack: PricingCreditPack): void {
    selectedPack.value = pack
    handleBuy()
  }

  function handleBuy(): void {
    if (publicMode) {
      requireEmployerCheckout(() => {
        void executeBuy()
      })
      return
    }
    void executeBuy()
  }

  async function init(): Promise<void> {
    await loadPacks()
    await tryConfirmFromReturnUrl()
  }

  return {
    session,
    packs,
    packsLoading,
    packsLoadError,
    selectedPack,
    loading,
    error,
    successMessage,
    clientSecret,
    returnUrl,
    packBadgeLabel,
    pricePerCredit,
    formatPrice,
    selectAndBuy,
    handleBuy,
    onPaymentSuccess,
    init,
    tryConfirmFromReturnUrl,
  }
}
