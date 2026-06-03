import { normalizeSiteUrl, parseAllowIndexing, parseLegalPublished } from '~/utils/seo-config'
import { getSeoSitemapStaticPaths } from '~/utils/seo-route-policy'
import { ROUTES } from '~/utils/app-routes'
import { buildSitemapXml, toIsoDate, type SitemapUrlEntry } from '../utils/sitemap-xml'

type SeoSitemapPayload = {
  static_paths: string[]
  jobs: Array<{ id: string; updated_at: string | null }>
  blog: Array<{ slug: string; published_at: string | null }>
  company_ads: Array<{ id: string; updated_at: string | null }>
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!parseAllowIndexing(String(config.public.allowIndexing ?? ''))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl || ''))
  if (!siteUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'NUXT_PUBLIC_SITE_URL is required for sitemap generation',
    })
  }
  const legalPublished = parseLegalPublished(String(config.public.legalPublished ?? ''))
  const apiBase = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  let payload: SeoSitemapPayload
  try {
    payload = await $fetch<SeoSitemapPayload>(`${apiBase}/api/seo/sitemap`)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Sitemap source unavailable' })
  }
  const staticPaths = getSeoSitemapStaticPaths(legalPublished)
  const entries: SitemapUrlEntry[] = []
  for (const path of staticPaths) {
    entries.push({ loc: `${siteUrl}${path}` })
  }
  for (const job of payload.jobs) {
    entries.push({
      loc: `${siteUrl}${ROUTES.jobDetail(job.id)}`,
      lastmod: toIsoDate(job.updated_at),
    })
  }
  for (const post of payload.blog) {
    entries.push({
      loc: `${siteUrl}${ROUTES.blogPost(post.slug)}`,
      lastmod: toIsoDate(post.published_at),
    })
  }
  for (const ad of payload.company_ads) {
    entries.push({
      loc: `${siteUrl}${ROUTES.professionalDetail(ad.id)}`,
      lastmod: toIsoDate(ad.updated_at),
    })
  }
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  return buildSitemapXml(entries)
})
