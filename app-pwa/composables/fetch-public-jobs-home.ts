import type { Job } from '~/utils/job'

export type PublicJobsHomeData = {
  latest: Job[]
  grid: Job[]
}

/** SSR-safe homepage job strips (no session cookies). */
export async function fetchPublicJobsHome(): Promise<PublicJobsHomeData | null> {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!base) return null
  try {
    const [latest, grid] = await Promise.all([
      $fetch<Job[]>(`${base}/api/jobs/latest`, { query: { limit: '4' } }),
      $fetch<Job[]>(`${base}/api/jobs`, {
        query: { limit: '8', offset: '0', is_active: 'true', sort: 'date_desc' },
      }),
    ])
    return {
      latest: Array.isArray(latest) ? latest : [],
      grid: Array.isArray(grid) ? grid : [],
    }
  } catch {
    return null
  }
}
