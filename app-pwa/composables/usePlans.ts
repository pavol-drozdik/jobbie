import { filterPublicSubscriptionPlans } from '~/utils/pricing-catalog'

export type PlanRow = {
  id: string
  slug: string
  name_sk: string
  price_monthly_cents: number
  max_active_jobs: number
  monthly_credits: number
  max_cv_unlocks_monthly: number | null
  max_cv_contacts_monthly: number | null
  max_cv_pdf_downloads_monthly: number | null
  sort_order: number
}

/** Session-cached subscription plans from GET /api/plans */
export function usePlans() {
  const { api } = useApi()
  const plans = useState<PlanRow[] | null>('catalog-plans-v3', () => null)
  const loading = useState('catalog-plans-loading-v3', () => false)

  async function load(force = false): Promise<PlanRow[]> {
    if (plans.value && !force) return plans.value
    loading.value = true
    try {
      const res = await api<PlanRow[]>('/api/plans', { skipSessionExpiry: true })
      const rows = filterPublicSubscriptionPlans(
        res.ok && Array.isArray(res.data) ? res.data : [],
      )
      plans.value = rows
      return rows
    } finally {
      loading.value = false
    }
  }

  return { plans, loading, load }
}
