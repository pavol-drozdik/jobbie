import {
  PRIVATE_DOCUMENT_CACHE_HEADERS,
  pathRequiresPrivateNoStore,
} from '../../utils/cache-route-policy'

/**
 * Set Cache-Control on sensitive HTML documents. CSR auth/CV routes do not
 * always inherit `nitro.routeRules` headers on Cloudflare Pages; middleware
 * ensures `no-store` reaches the origin response (+ `CDN-Cache-Control` for CF).
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!pathRequiresPrivateNoStore(path)) return
  for (const [name, value] of Object.entries(PRIVATE_DOCUMENT_CACHE_HEADERS)) {
    setResponseHeader(event, name, value)
  }
})
