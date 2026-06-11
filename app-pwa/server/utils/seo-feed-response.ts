import { parseAllowIndexing, normalizeSiteUrl } from '~/utils/seo-config'
import { buildJsonFeed } from './feed-json'
import { buildRssXml, toRfc822Date } from './feed-rss-xml'
import { absSiteUrl, fetchSeoFeed } from './seo-feed-fetch'

type FeedKind = 'jobs' | 'ads'

const FEED_META: Record<
  FeedKind,
  { rssPath: string; jsonPath: string; catalogPath: string; title: string; description: string }
> = {
  jobs: {
    rssPath: '/feeds/jobs.rss',
    jsonPath: '/feeds/jobs.json',
    catalogPath: '/pracovne-ponuky',
    title: 'JOBBIE — Pracovné ponuky',
    description: 'Najnovšie pracovné ponuky a brigády na Jobbie.',
  },
  ads: {
    rssPath: '/feeds/ads.rss',
    jsonPath: '/feeds/ads.json',
    catalogPath: '/profesionali',
    title: 'JOBBIE — Profesionáli',
    description: 'Najnovšie inzeráty služieb profesionálov na Jobbie.',
  },
}

function requireIndexingSiteUrl(event: { context?: unknown }): { siteUrl: string; apiBase: string } {
  const config = useRuntimeConfig(event)
  if (!parseAllowIndexing(String(config.public.allowIndexing ?? ''))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl || ''))
  if (!siteUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'NUXT_PUBLIC_SITE_URL is required for feeds',
    })
  }
  const apiBase = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!apiBase) {
    throw createError({ statusCode: 503, statusMessage: 'API base URL is required for feeds' })
  }
  return { siteUrl, apiBase }
}

export async function buildSeoFeedRss(event: { context?: unknown }, kind: FeedKind): Promise<string> {
  const { siteUrl, apiBase } = requireIndexingSiteUrl(event)
  const meta = FEED_META[kind]
  let payload
  try {
    payload = await fetchSeoFeed(apiBase, kind)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Feed source unavailable' })
  }
  const feedUrl = absSiteUrl(siteUrl, meta.rssPath)
  const items = (payload.items ?? []).map((item) => {
    const link = absSiteUrl(siteUrl, item.url_path)
    return {
      guid: link,
      link,
      title: item.title,
      description: item.summary,
      pubDate: toRfc822Date(item.updated_at ?? item.published_at),
      enclosureUrl: item.image_url,
    }
  })
  return buildRssXml({
    title: meta.title,
    link: feedUrl,
    description: meta.description,
    language: 'sk',
    lastBuildDate: items[0] ? items[0].pubDate : undefined,
    items,
  })
}

export async function buildSeoFeedJson(event: { context?: unknown }, kind: FeedKind): Promise<string> {
  const { siteUrl, apiBase } = requireIndexingSiteUrl(event)
  const meta = FEED_META[kind]
  let payload
  try {
    payload = await fetchSeoFeed(apiBase, kind)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Feed source unavailable' })
  }
  const feedUrl = absSiteUrl(siteUrl, meta.jsonPath)
  return buildJsonFeed({
    version: 'https://jsonfeed.org/version/1.1',
    title: meta.title,
    home_page_url: absSiteUrl(siteUrl, meta.catalogPath),
    feed_url: feedUrl,
    description: meta.description,
    language: 'sk',
    items: (payload.items ?? []).map((item) => ({
      id: item.id,
      url: absSiteUrl(siteUrl, item.url_path),
      title: item.title,
      summary: item.summary,
      date_published: item.published_at,
      date_modified: item.updated_at,
      image: item.image_url,
    })),
  })
}

export function setFeedCacheHeaders(event: { context?: unknown }): void {
  setHeader(event, 'cache-control', 'public, max-age=300')
}
