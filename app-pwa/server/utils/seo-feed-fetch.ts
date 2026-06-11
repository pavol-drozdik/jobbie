import { normalizeSiteUrl } from '~/utils/seo-config'

export type SeoFeedApiItem = {
  id: string
  title: string
  summary: string
  url_path: string
  published_at: string
  updated_at: string | null
  image_url: string | null
}

export type SeoFeedApiPayload = {
  items: SeoFeedApiItem[]
}

export async function fetchSeoFeed(
  apiBase: string,
  kind: 'jobs' | 'ads',
): Promise<SeoFeedApiPayload> {
  const base = apiBase.replace(/\/+$/, '')
  return $fetch<SeoFeedApiPayload>(`${base}/api/seo/feeds/${kind}`)
}

export function absSiteUrl(siteUrl: string, path: string): string {
  const origin = normalizeSiteUrl(siteUrl)
  const p = path.startsWith('/') ? path : `/${path}`
  return `${origin}${p}`
}
