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
  // Strip origin stack fingerprints; Cloudflare may still add `Server: cloudflare` at the edge.
  removeResponseHeader(event, 'Server')
  removeResponseHeader(event, 'X-Powered-By')
})
