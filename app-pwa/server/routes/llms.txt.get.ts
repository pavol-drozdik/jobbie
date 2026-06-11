import { parseAllowIndexing, normalizeSiteUrl } from '~/utils/seo-config'
import { buildLlmsTxt } from '~/utils/llms-txt'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  if (!parseAllowIndexing(String(config.public.allowIndexing ?? ''))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl || ''))
  if (!siteUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'NUXT_PUBLIC_SITE_URL is required for llms.txt',
    })
  }
  const brandName = String(config.public.brandName || 'JOBBIE')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  return buildLlmsTxt({ siteUrl, brandName })
})
