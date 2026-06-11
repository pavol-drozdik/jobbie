import { parseAllowIndexing } from '~/utils/seo-config'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const indexNowKey = String(config.public.indexNowKey || '').trim()
  const routeKey = String(getRouterParam(event, 'key') || '').trim()
  if (!indexNowKey || routeKey !== indexNowKey) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  if (!parseAllowIndexing(String(config.public.allowIndexing ?? ''))) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return `${indexNowKey}\n`
})
