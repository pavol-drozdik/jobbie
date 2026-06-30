import {
  buildPlatformSecurityHeaders,
  pathShouldIncludeCsp,
} from '../../utils/platform-csp'

/**
 * Single source of truth for platform security headers on every Nitro response.
 * Do not repeat these in `nitro.routeRules` — overlapping rules (e.g. `/**` + `/`)
 * append duplicate values (`X-Frame-Options: DENY, DENY`), which scanners reject.
 */
export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  const nonce = (event.context.cspNonce as string | undefined) || undefined
  const publicConfig = useRuntimeConfig(event).public
  const headers = buildPlatformSecurityHeaders({
    scriptNonce: nonce,
    includeCsp: pathShouldIncludeCsp(pathname),
    publicConfig: {
      apiBaseUrl: String(publicConfig.apiBaseUrl ?? ''),
      supabaseUrl: String(publicConfig.supabaseUrl ?? ''),
      cdnUrl: String(publicConfig.cdnUrl ?? ''),
      posthogHost: String(publicConfig.posthogHost ?? ''),
    },
  })
  for (const [name, value] of Object.entries(headers)) {
    if (!getResponseHeader(event, name)) {
      setResponseHeader(event, name, value)
    }
  }

  // Prevent Cloudflare from injecting scripts (e.g. email-obfuscation decode) into
  // HTML responses. Such injections lack the per-request nonce and are blocked by our
  // strict-dynamic CSP. `no-transform` tells Cloudflare's edge not to modify the body.
  if (pathShouldIncludeCsp(pathname)) {
    const existing = getResponseHeader(event, 'Cache-Control')
    if (typeof existing === 'string' && existing) {
      if (!existing.includes('no-transform')) {
        setResponseHeader(event, 'Cache-Control', `${existing}, no-transform`)
      }
    } else if (!existing) {
      setResponseHeader(event, 'Cache-Control', 'no-transform')
    }
  }

  // Strip origin stack fingerprints; Cloudflare may still add `Server: cloudflare` at the edge.
  removeResponseHeader(event, 'Server')
  removeResponseHeader(event, 'X-Powered-By')
})
