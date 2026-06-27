/**

 * Shared Content-Security-Policy builder for Nitro route rules and per-request nonces.

 */



import { isStaticAssetPath } from './cache-route-policy'



export type PlatformCspOptions = {

  apiOrigin: string

  /** When omitted, derived from `apiOrigin` via {@link apiWebSocketOrigin}. */

  apiWebSocketOrigin?: string | null

  /** Asset CDN origin (`NUXT_PUBLIC_CDN_URL`) for bundled fonts and `_nuxt` chunks. */

  cdnOrigin?: string

  supabaseOrigin: string

  posthogHost: string

  /** Per-request nonce for first-party inline scripts (SSR). */

  scriptNonce?: string

}



const STRIPE_PAYMENT_ORIGINS =

  '"https://js.stripe.com" "https://hooks.stripe.com" "https://checkout.stripe.com" "https://m.stripe.network"'



/** True when the API origin is plain HTTP on localhost (dev). */

export function isLocalHttpApiOrigin(apiOrigin: string): boolean {

  try {

    const u = new URL(apiOrigin)

    return (

      u.protocol === 'http:' &&

      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')

    )

  } catch {

    return false

  }

}



/** Derive WebSocket origin from API HTTPS/HTTP origin (CSP treats wss: separately from https:). */
export function apiWebSocketOrigin(apiOrigin: string): string | null {
  try {
    const u = new URL(apiOrigin)
    if (u.protocol === 'https:') return `wss://${u.host}`
    if (u.protocol === 'http:') return `ws://${u.host}`
  } catch {
    /* ignore */
  }
  return null
}

export function resolvePlatformCspOrigins(): {
  apiOrigin: string
  apiWebSocketOrigin: string | null
  cdnOrigin: string
  supabaseOrigin: string
  posthogHost: string
} {

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL?.trim() ?? ''

  let supabaseOrigin = ''

  try {

    if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin

  } catch {

    /* ignore */

  }

  const apiRaw =

    process.env.NUXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8000'

  let apiOrigin = apiRaw.replace(/\/+$/, '')

  try {

    apiOrigin = new URL(apiOrigin).origin

  } catch {

    /* keep string */

  }

  const posthogHost =

    process.env.NUXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com'

  const cdnRaw = process.env.NUXT_PUBLIC_CDN_URL?.trim() ?? ''

  let cdnOrigin = ''

  try {

    if (cdnRaw) cdnOrigin = new URL(cdnRaw).origin

  } catch {

    /* ignore */

  }

  return {
    apiOrigin,
    apiWebSocketOrigin: apiWebSocketOrigin(apiOrigin),
    cdnOrigin,
    supabaseOrigin,
    posthogHost,
  }

}



export function buildContentSecurityPolicy(options: PlatformCspOptions): string {

  const {
    apiOrigin,
    apiWebSocketOrigin: apiWsOption,
    cdnOrigin = '',
    supabaseOrigin,
    posthogHost,
    scriptNonce,
  } = options

  const apiWs = apiWsOption ?? apiWebSocketOrigin(apiOrigin)

  const connectSrc = [

    "'self'",

    apiOrigin,

    apiWs,

    cdnOrigin,

    supabaseOrigin,

    'https://*.supabase.co',

    'wss://*.supabase.co',

    'https://api.stripe.com',

    'https://checkout.stripe.com',

    'https://m.stripe.network',

    'https://*.sentry.io',

    posthogHost,

    'https://www.google-analytics.com',

    'https://*.google-analytics.com',

    'https://analytics.google.com',

    'https://www.clarity.ms',

    'https://*.clarity.ms',

  ]

    .filter(Boolean)

    .join(' ')

  const imgSrc = [

    "'self'",

    'data:',

    'blob:',

    supabaseOrigin,

    'https://*.supabase.co',

    'https://*.stripe.com',

    'https://www.google-analytics.com',

    'https://*.google-analytics.com',

    'https://*.clarity.ms',

  ]

    .filter(Boolean)

    .join(' ')

  const scriptSrcParts = ["'self'"]

  if (scriptNonce) {

    scriptSrcParts.push(`'nonce-${scriptNonce}'`, "'strict-dynamic'")

  } else {

    scriptSrcParts.push("'unsafe-inline'")

  }

  scriptSrcParts.push(

    'https://js.stripe.com',

    'https://checkout.stripe.com',

    'https://challenges.cloudflare.com',

    'https://www.googletagmanager.com',

    'https://www.clarity.ms',

    'https://*.clarity.ms',

  )

  const scriptSrc = scriptSrcParts.join(' ')

  const directives = [

    "default-src 'self'",

    `script-src ${scriptSrc}`,

    `connect-src ${connectSrc}`,

    `img-src ${imgSrc}`,

    "style-src 'self' 'unsafe-inline'",

    ['font-src', "'self'", 'data:', cdnOrigin].filter(Boolean).join(' '),

    'frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://challenges.cloudflare.com',

    "base-uri 'self'",

    "form-action 'self'",

    "frame-ancestors 'none'",

    "object-src 'none'",

    "worker-src 'self' blob:",

    "manifest-src 'self'",

  ]

  // upgrade-insecure-requests on http://localhost spams empty CSP reports in dev.

  if (!isLocalHttpApiOrigin(apiOrigin)) {

    directives.push('upgrade-insecure-requests')

  }

  return directives.join('; ')

}



export function buildPermissionsPolicy(): string {

  return `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self ${STRIPE_PAYMENT_ORIGINS}), publickey-credentials-get=(self), interest-cohort=(), browsing-topics=()`

}



export type PlatformSecurityHeadersOptions = {

  scriptNonce?: string

  /** Omit CSP on hashed static assets — policy applies to HTML documents only. */

  includeCsp?: boolean

}



export function buildPlatformSecurityHeaders(

  scriptNonceOrOptions?: string | PlatformSecurityHeadersOptions,

): Record<string, string> {

  const options: PlatformSecurityHeadersOptions =

    typeof scriptNonceOrOptions === 'string'

      ? { scriptNonce: scriptNonceOrOptions }

      : (scriptNonceOrOptions ?? {})

  const { scriptNonce, includeCsp = true } = options

  const origins = resolvePlatformCspOrigins()

  const headers: Record<string, string> = {

    'X-Content-Type-Options': 'nosniff',

    /** Legacy clickjacking guard; CSP `frame-ancestors 'none'` below is authoritative. */

    'X-Frame-Options': 'DENY',

    /** Legacy XSS auditor for older browsers; CSP `script-src` is authoritative. */

    'X-XSS-Protection': '1; mode=block',

    'Referrer-Policy': 'strict-origin-when-cross-origin',

    'Permissions-Policy': buildPermissionsPolicy(),

    'Cross-Origin-Opener-Policy': 'same-origin',

    'Cross-Origin-Resource-Policy': 'same-site',

  }

  if (includeCsp) {

    const csp = buildContentSecurityPolicy({ ...origins, scriptNonce })
    headers['Content-Security-Policy'] = csp

    if (!isLocalHttpApiOrigin(origins.apiOrigin)) {

      headers['Strict-Transport-Security'] =

        'max-age=63072000; includeSubDomains; preload'

      headers['Content-Security-Policy-Report-Only'] =

        `${csp}; report-uri ${origins.apiOrigin}/api/csp-report`

    }

  }

  return headers

}



/** Whether CSP response headers should be set for this request path. */

export function pathShouldIncludeCsp(pathname: string): boolean {

  const path = pathname.split('?')[0] ?? pathname

  return !isStaticAssetPath(path)

}


