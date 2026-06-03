import type { CompanyAdListItem } from '~/utils/company-ad'

/**
 * Current user's company ads for the firmy hub (all statuses).
 */
export function useProfileMyCompanyAds() {
  const { api } = useApi()
  const ads = ref<CompanyAdListItem[]>([])
  const loading = ref(true)
  const loadError = ref<string | null>(null)

  async function loadAds(): Promise<void> {
    loading.value = true
    loadError.value = null
    const res = await api<CompanyAdListItem[]>('/api/company-ads', {
      query: { my: 'true', limit: '100' },
    })
    if (res.ok && Array.isArray(res.data)) {
      ads.value = res.data
    } else {
      ads.value = []
      loadError.value = res.body?.slice(0, 120) ?? 'Nepodarilo sa načítať reklamy.'
    }
    loading.value = false
  }

  return { ads, loading, loadError, loadAds }
}
