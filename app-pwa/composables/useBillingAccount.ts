import {
  hasPaidPlanAccessFromAccount,
  hasPlusOrProAccessFromAccount,
  type BillingAccountSnapshot,
} from '~/utils/billing-account-access'

export type BillingAccount = BillingAccountSnapshot & {
  planNameSk?: string
  credits?: number
}

/** Session-cached billing account from GET /api/billing/account */
export function useBillingAccount() {
  const { user } = useAuth()
  const { api } = useApi()

  const account = useState<BillingAccount | null>('billing-account-v1', () => null)
  const loading = useState('billing-account-loading-v1', () => false)
  const loaded = useState('billing-account-loaded-v1', () => false)

  const hasPaidPlanAccess = computed(() => hasPaidPlanAccessFromAccount(account.value))
  const hasPlusOrProAccess = computed(() => hasPlusOrProAccessFromAccount(account.value))

  async function load(force = false): Promise<void> {
    if (!user.value) {
      account.value = null
      loaded.value = true
      return
    }
    if (loaded.value && account.value && !force) return
    loading.value = true
    try {
      const res = await api<BillingAccount>('/api/billing/account')
      if (res.ok && res.data) {
        account.value = {
          planSlug: res.data.planSlug,
          subscriptionStatus: res.data.subscriptionStatus ?? null,
          currentPeriodEnd: res.data.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: res.data.cancelAtPeriodEnd ?? false,
          hasPlusOrProAccess: res.data.hasPlusOrProAccess ?? false,
          subscriptionTrialEligible: res.data.subscriptionTrialEligible === true,
          planNameSk: res.data.planNameSk,
          credits: res.data.credits,
        }
      } else {
        account.value = null
      }
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  return {
    account,
    loading,
    loaded,
    hasPaidPlanAccess,
    hasPlusOrProAccess,
    load,
  }
}
