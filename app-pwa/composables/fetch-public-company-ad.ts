import type { CompanyAd } from '~/utils/company-ad'

/** Fetch a public company ad for SSR/SEO (optional auth). */
export async function fetchPublicCompanyAd(adId: string): Promise<CompanyAd | null> {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!base || !adId) return null
  try {
    return await $fetch<CompanyAd>(`${base}/api/company-ads/${encodeURIComponent(adId)}`)
  } catch {
    return null
  }
}
