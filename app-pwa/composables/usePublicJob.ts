import type { Job } from '~/utils/job'

/** Fetch a public job offer for SSR/SEO (no auth cookies required). */
export async function fetchPublicJob(jobId: string): Promise<Job | null> {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!base || !jobId) return null
  try {
    return await $fetch<Job>(`${base}/api/jobs/${encodeURIComponent(jobId)}`)
  } catch {
    return null
  }
}
