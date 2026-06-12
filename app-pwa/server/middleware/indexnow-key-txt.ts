import { parseAllowIndexing } from '~/utils/seo-config'

const RESERVED_ROOT_TXT = new Set(['robots.txt', 'llms.txt'])

/**
 * IndexNow key file at `/{NUXT_PUBLIC_INDEXNOW_KEY}.txt`.
 * Do not use `server/routes/[key].txt.get.ts` — Nitro/radix3 treats `/:key.txt` as a
 * catch-all param named `key.txt`, which 404s every page in dev.
 */
export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  if (!pathname.endsWith('.txt') || pathname.includes('/', 1)) {
    return
  }

  const basename = pathname.slice(1)
  if (RESERVED_ROOT_TXT.has(basename)) {
    return
  }

  const config = useRuntimeConfig(event)
  const indexNowKey = String(config.public.indexNowKey || '').trim()
  if (!indexNowKey || !parseAllowIndexing(String(config.public.allowIndexing ?? ''))) {
    return
  }

  const routeKey = basename.slice(0, -'.txt'.length)
  if (routeKey !== indexNowKey) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return `${indexNowKey}\n`
})
