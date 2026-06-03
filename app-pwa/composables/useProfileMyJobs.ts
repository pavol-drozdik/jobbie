import type { Job } from '~/utils/job'

/**
 * Shared list of current user's job offers for profile tab panels.
 */
export function useProfileMyJobs(opts?: { isForeign?: boolean }) {
  const { api } = useApi()
  const jobs = ref<Job[]>([])
  const loading = ref(true)
  const loadError = ref<string | null>(null)
  async function loadJobs(): Promise<void> {
    loading.value = true
    loadError.value = null
    const query: Record<string, string> = { my: 'true', limit: '100' }
    if (opts?.isForeign === true) {
      query.is_foreign = 'true'
    } else if (opts?.isForeign === false) {
      query.is_foreign = 'false'
    }
    const res = await api<Job[]>('/api/jobs', { query })
    if (res.ok && Array.isArray(res.data)) {
      jobs.value = res.data
    } else {
      jobs.value = []
      loadError.value = res.body?.slice(0, 120) ?? 'Nepodarilo sa načítať ponuky.'
    }
    loading.value = false
  }
  return { jobs, loading, loadError, loadJobs }
}
