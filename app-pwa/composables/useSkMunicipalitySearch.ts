import type { SkMunicipalityRow } from '~/utils/sk-municipality'

const DEBOUNCE_MS = 280

export function useSkMunicipalitySearch() {
  const { api } = useApi()
  const results = ref<SkMunicipalityRow[]>([])
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

  async function fetchMunicipalities(query: string): Promise<void> {
    const q = query.trim()
    if (q.length < 2) {
      results.value = []
      loading.value = false
      return
    }
    cancelInFlight()
    abortController = new AbortController()
    loading.value = true
    try {
      const res = await api<SkMunicipalityRow[]>('/api/locations/sk-municipalities', {
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
    if (q.length < 2) {
      cancelInFlight()
      results.value = []
      loading.value = false
      return
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void fetchMunicipalities(q)
    }, DEBOUNCE_MS)
  }

  function dispose(): void {
    clearDebounce()
    cancelInFlight()
    results.value = []
  }

  async function ensureMunicipality(name: string): Promise<SkMunicipalityRow | null> {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      return null
    }
    try {
      const res = await api<SkMunicipalityRow>('/api/locations/sk-municipalities', {
        method: 'POST',
        body: { name: trimmed },
      })
      if (!res.ok || !res.data) {
        return null
      }
      return res.data
    } catch {
      return null
    }
  }

  return {
    results,
    loading,
    scheduleSearch,
    fetchMunicipalities,
    ensureMunicipality,
    dispose,
  }
}
