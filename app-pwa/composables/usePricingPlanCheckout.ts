import { ROUTES } from '~/utils/app-routes'
import type { PlanRow } from '~/composables/usePlans'
import { filterPublicSubscriptionPlans } from '~/utils/pricing-catalog'

export type PricingMySubscription = {
  plan_id: string
  plan_name_sk: string
  status: string
  current_period_end: string | null
}

export function usePricingPlanCheckout(options: {
  returnBasePath: string
  publicMode?: boolean
  embedded?: boolean
  showDowngradeConfirm?: boolean
}) {
  const {
    returnBasePath,
    publicMode = false,
    embedded = false,
    showDowngradeConfirm = false,
  } = options

  const { requireEmployerCheckout } = usePricingCheckout(returnBasePath)
  const {
    ensureRecentLoginForBilling,
    billingStepUpUserMessage,
    isStepUpRequiredResponse,
    tryRecoverFromStepUpRequired,
  } = useBillingStepUp()
  const { api } = useApi()
  const { load: loadPlansCatalog } = usePlans()
  const { session, refreshUser } = useAuth()
  const route = useRoute()
  const router = useRouter()
  const requestURL = useRequestURL()

  const plans = ref<PlanRow[]>([])
  const mySub = ref<PricingMySubscription | null>(null)
  const loading = ref(true)
  const loadError = ref<string | null>(null)
  const actionLoading = ref<string | null>(null)
  const successFlash = ref<string | null>(null)
  const downgradeOpen = ref(false)
  const pendingFreePlanId = ref<string | null>(null)

  const visiblePlans = computed(() =>
    [...plans.value].sort((a, b) => a.sort_order - b.sort_order),
  )

  function plansSuccessPath(): string {
    if (publicMode) return `${returnBasePath}?success=1`
    return embedded
      ? `${ROUTES.profile}?tab=plans&success=1`
      : `${ROUTES.pricing}?tab=plans&success=1`
  }

  function plansCancelPath(): string {
    if (publicMode) return `${returnBasePath}?cancel=1`
    return embedded
      ? `${ROUTES.profile}?tab=plans&cancel=1`
      : `${ROUTES.pricing}?tab=plans&cancel=1`
  }

  function getReturnUrl(path: string): string {
    if (import.meta.client && typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return `${requestURL.origin}${path}`
  }

  async function load(): Promise<void> {
    loadError.value = null
    const rows = await loadPlansCatalog(true)
    plans.value = filterPublicSubscriptionPlans(rows)
    const token = session.value?.access_token
    if (!token) {
      mySub.value = null
      return
    }
    const meRes = await api<PricingMySubscription | null>('/api/plans/me')
    if (!meRes.ok) {
      mySub.value = null
      return
    }
    mySub.value = meRes.data ?? null
  }

  async function executeSelectPlan(
    planId: string,
    priceCents: number,
    confirmDowngrade = false,
  ): Promise<void> {
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      loadError.value = gate.message
      return
    }
    actionLoading.value = planId
    try {
      if (priceCents > 0) {
        await navigateTo(ROUTES.checkoutPlan(planId, returnBasePath))
        return
      }
      const successUrl = getReturnUrl(plansSuccessPath())
      const cancelUrl = getReturnUrl(plansCancelPath())
      const subscriptionBody = {
        plan_id: planId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        confirm_downgrade: confirmDowngrade,
      }
      let res = await api('/api/payments/checkout-subscription', {
        method: 'POST',
        body: subscriptionBody,
      })
      if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {
        res = await api('/api/payments/checkout-subscription', {
          method: 'POST',
          body: subscriptionBody,
        })
      }
      if (res.ok) {
        await load()
        await refreshUser()
        successFlash.value = 'Predplatné bolo aktivované.'
      } else {
        loadError.value = await billingStepUpUserMessage(res)
      }
    } finally {
      actionLoading.value = null
    }
  }

  async function selectPlan(planId: string, priceCents: number): Promise<void> {
    const run = (): Promise<void> => {
      if (
        showDowngradeConfirm &&
        priceCents === 0 &&
        mySub.value &&
        plans.value.find((p) => p.id === mySub.value?.plan_id)?.price_monthly_cents !== 0
      ) {
        pendingFreePlanId.value = planId
        downgradeOpen.value = true
        return Promise.resolve()
      }
      return executeSelectPlan(planId, priceCents, priceCents === 0)
    }
    if (publicMode) {
      requireEmployerCheckout(() => {
        void run()
      })
      return
    }
    await run()
  }

  async function confirmDowngrade(): Promise<void> {
    const planId = pendingFreePlanId.value
    downgradeOpen.value = false
    pendingFreePlanId.value = null
    if (!planId) return
    await executeSelectPlan(planId, 0, true)
  }

  function isOnPlansRoute(): boolean {
    if (publicMode) return route.path === returnBasePath
    if (embedded) return route.query.tab === 'plans'
    return route.path === ROUTES.pricing && route.query.tab === 'plans'
  }

  async function applyQueryFlashAndStrip(): Promise<void> {
    if (!isOnPlansRoute()) return
    const q = route.query
    if (q.success === '1' || q.success === 'true') {
      successFlash.value = 'Predplatné bolo aktivované.'
      await refreshUser()
      const next = { ...q }
      delete (next as Record<string, unknown>).success
      await router.replace({ path: route.path, query: next })
    }
    if (q.cancel === '1' || q.cancel === 'true') {
      loadError.value = 'Platba bola zrušená.'
      const next = { ...q }
      delete (next as Record<string, unknown>).cancel
      await router.replace({ path: route.path, query: next })
    }
  }

  async function init(): Promise<void> {
    await load()
    loading.value = false
  }

  return {
    plans,
    visiblePlans,
    mySub,
    loading,
    loadError,
    actionLoading,
    successFlash,
    downgradeOpen,
    selectPlan,
    confirmDowngrade,
    load,
    init,
    applyQueryFlashAndStrip,
  }
}
