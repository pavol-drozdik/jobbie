import { normalizeSiteUrl } from '~/utils/seo-config'

export type SeoAlternateFeed = {
  type: string
  href: string
  title?: string
}

export function buildJobsAlternateFeeds(siteUrl: string): SeoAlternateFeed[] {
  const origin = normalizeSiteUrl(siteUrl)
  if (!origin) return []
  return [
    {
      type: 'application/rss+xml',
      href: `${origin}/feeds/jobs.rss`,
      title: 'JOBBIE — Pracovné ponuky (RSS)',
    },
    {
      type: 'application/feed+json',
      href: `${origin}/feeds/jobs.json`,
      title: 'JOBBIE — Pracovné ponuky (JSON Feed)',
    },
  ]
}

export function buildAdsAlternateFeeds(siteUrl: string): SeoAlternateFeed[] {
  const origin = normalizeSiteUrl(siteUrl)
  if (!origin) return []
  return [
    {
      type: 'application/rss+xml',
      href: `${origin}/feeds/ads.rss`,
      title: 'JOBBIE — Profesionáli (RSS)',
    },
    {
      type: 'application/feed+json',
      href: `${origin}/feeds/ads.json`,
      title: 'JOBBIE — Profesionáli (JSON Feed)',
    },
  ]
}
