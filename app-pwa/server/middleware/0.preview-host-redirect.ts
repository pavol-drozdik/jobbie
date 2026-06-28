import { normalizeSiteUrl } from '~/utils/seo-config'
import {
  buildCanonicalRedirectUrl,
  isJobbiePagesDevHost,
} from '~/utils/preview-host-redirect'

/**
 * Redirect Cloudflare `*.pages.dev` traffic to `NUXT_PUBLIC_SITE_URL` (e.g. www.jobbie.sk).
 * Cloudflare `_redirects` cannot do domain-level redirects; this runs on Nitro/Pages Function requests.
 */
export default defineEventHandler((event) => {
  const host = getRequestHost(event, { xForwardedHost: true })
  if (!isJobbiePagesDevHost(host)) return

  const config = useRuntimeConfig()
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl || ''))
  if (!siteUrl) return

  try {
    const canonicalHost = new URL(siteUrl).host.toLowerCase().split(':')[0]
    const requestHost = host?.toLowerCase().split(':')[0]
    if (canonicalHost && requestHost && canonicalHost === requestHost) return
  } catch {
    return
  }

  const url = getRequestURL(event)
  const destination = buildCanonicalRedirectUrl(siteUrl, url.pathname, url.search)
  if (!destination) return

  return sendRedirect(event, destination, 301)
})
