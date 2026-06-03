import type { SkCompanyRow } from '~/utils/sk-company'

const DEBOUNCE_MS = 400
const MIN_QUERY_LEN = 3

export function useSkCompanySearch() {
  const { api } = useApi()
  const results = ref<SkCompanyRow[]>([])
  const loading = ref(false)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null

  function clearDebounce(): void {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  function cancelInFlight(): void {
    abortController?.abort()
    abortController = null
  }

  async function fetchCompanies(query: string): Promise<void> {
    const q = query.trim()
    if (q.length < MIN_QUERY_LEN) {
      results.value = []
      loading.value = false
      return
    }
    cancelInFlight()
    abortController = new AbortController()
    loading.value = true
    try {
      const res = await api<SkCompanyRow[]>('/api/locations/sk-companies', {
        query: { query: q, limit: '50' },
        signal: abortController.signal,
      })
      if (!res.ok) {
        results.value = []
        return
      }
      results.value = Array.isArray(res.data) ? res.data : []
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      results.value = []
    } finally {
      loading.value = false
    }
  }

  function scheduleSearch(query: string): void {
    clearDebounce()
    const q = query.trim()
    if (q.length < MIN_QUERY_LEN) {
      cancelInFlight()
      results.value = []
      loading.value = false
      return
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void fetchCompanies(q)
    }, DEBOUNCE_MS)
  }

  function dispose(): void {
    clearDebounce()
    cancelInFlight()
    results.value = []
  }

  return {
    results,
    loading,
    scheduleSearch,
    fetchCompanies,
    dispose,
  }
}
