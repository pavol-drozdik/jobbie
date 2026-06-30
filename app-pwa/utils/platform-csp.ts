/**

 * Shared Content-Security-Policy builder for Nitro route rules and per-request nonces.

 */



import { normalizePublicApiBase } from './api-base-url'
import { isStaticAssetPath } from './cache-route-policy'

/** Subset of `runtimeConfig.public` used for CSP origin allowlists. */
export type PlatformCspPublicConfig = {
  apiBaseUrl?: string
  supabaseUrl?: string
  cdnUrl?: string
  posthogHost?: string
}



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

function originFromUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    return new URL(trimmed).origin
  } catch {
    return ''
  }
}

/** PostHog session replay / asset host (e.g. eu.i → eu-assets.i.posthog.com). */
export function derivePosthogAssetsOrigin(posthogHost: string): string {
  const trimmed = posthogHost.trim()
  if (!trimmed) {
    return ''
  }
  try {
    const u = new URL(trimmed)
    const assetsHost = u.hostname.replace(
      /^([a-z0-9-]+)\.i\.posthog\.com$/i,
      '$1-assets.i.posthog.com',
    )
    if (assetsHost === u.hostname) {
      return ''
    }
    return `${u.protocol}//${assetsHost}`
  } catch {
    return ''
  }
}

/**
 * CSP allowlist origins. Prefer {@link PlatformCspPublicConfig} from
 * `useRuntimeConfig(event).public` on Cloudflare Workers — `process.env` is empty
 * at the edge while `runtimeConfig` is baked in at build time.
 */
export function resolvePlatformCspOrigins(
  publicConfig?: PlatformCspPublicConfig,
): {
  apiOrigin: string
  apiWebSocketOrigin: string | null
  cdnOrigin: string
  supabaseOrigin: string
  posthogHost: string
} {
  const supabaseUrl =
    publicConfig?.supabaseUrl?.trim() ||
    process.env.NUXT_PUBLIC_SUPABASE_URL?.trim() ||
    ''
  const supabaseOrigin = originFromUrl(supabaseUrl)

  const apiOrigin = normalizePublicApiBase(
    publicConfig?.apiBaseUrl?.trim() ||
      process.env.NUXT_PUBLIC_API_BASE_URL?.trim(),
  )

  const posthogHost =
    publicConfig?.posthogHost?.trim() ||
    process.env.NUXT_PUBLIC_POSTHOG_HOST?.trim() ||
    'https://eu.i.posthog.com'

  const cdnRaw =
    publicConfig?.cdnUrl?.trim() || process.env.NUXT_PUBLIC_CDN_URL?.trim() || ''
  const cdnOrigin = originFromUrl(cdnRaw)

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
  const posthogAssetsOrigin = derivePosthogAssetsOrigin(posthogHost)

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

    posthogAssetsOrigin,

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
  /** Nitro / Cloudflare: use build-time public runtime config for CSP origins. */
  publicConfig?: PlatformCspPublicConfig
}



export function buildPlatformSecurityHeaders(

  scriptNonceOrOptions?: string | PlatformSecurityHeadersOptions,

): Record<string, string> {

  const options: PlatformSecurityHeadersOptions =

    typeof scriptNonceOrOptions === 'string'

      ? { scriptNonce: scriptNonceOrOptions }

      : (scriptNonceOrOptions ?? {})

  const { scriptNonce, includeCsp = true, publicConfig } = options

  const origins = resolvePlatformCspOrigins(publicConfig)

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

      // upgrade-insecure-requests is invalid in report-only policies (browsers ignore + warn).
      const reportOnlyCsp = csp
        .split('; ')
        .filter((d) => !d.startsWith('upgrade-insecure-requests'))
        .join('; ')
      headers['Content-Security-Policy-Report-Only'] =

        `${reportOnlyCsp}; report-uri ${origins.apiOrigin}/api/csp-report`

    }

  }

  return headers

}



/** Whether CSP response headers should be set for this request path. */

export function pathShouldIncludeCsp(pathname: string): boolean {

  const path = pathname.split('?')[0] ?? pathname

  return !isStaticAssetPath(path)

}


