/** Build-time / config helpers for SEO indexability and absolute URLs. */

import { pathShouldNoindex, SEO_PUBLIC_SSR_ROUTE_PATTERNS } from './seo-route-policy'

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

export function parseTruthy(raw: string | undefined): boolean {
  if (!raw) return false
  return TRUTHY.has(raw.trim().toLowerCase())
}

export function parseAllowIndexing(raw: string | undefined): boolean {
  return parseTruthy(raw)
}

export function parseLegalPublished(raw: string | undefined): boolean {
  return parseTruthy(raw)
}

export function normalizeSiteUrl(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    return url.origin
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

export const SEO_DEFAULT_TITLE = 'Brigády a pracovné ponuky'
export const SEO_DEFAULT_DESCRIPTION =
  'Jobbie — slovenská platforma pre brigády, sezónne práce, pracovné ponuky a služby profesionálov na Slovensku aj v zahraničí. Registrácia zadarmo.'
/** Default OG/Twitter card (`summary_large_image`). Source: `jobbiecvdesign/Photos/twittercard.png`. */
export const SEO_DEFAULT_OG_IMAGE_PATH = '/img/twittercard.png'
export const SEO_BRAND_SUFFIX = 'JOBBIE'

/** Full title for OG/Twitter; document `<title>` suffix comes from `nuxt.config` `titleTemplate`. */
export function formatBrandedSeoTitle(
  pageTitle: string,
  brandName: string = SEO_BRAND_SUFFIX,
): string {
  const raw = pageTitle.trim()
  if (!raw) return `${SEO_DEFAULT_TITLE} — ${brandName}`
  return `${raw} — ${brandName}`
}

/** @deprecated Use `SEO_PUBLIC_SSR_ROUTE_PATTERNS` */
export const SEO_PUBLIC_SSR_ROUTES = SEO_PUBLIC_SSR_ROUTE_PATTERNS

export function robotsMetaContent(allowIndexing: boolean, pathname: string): string {
  if (!allowIndexing || pathShouldNoindex(pathname)) {
    return 'noindex, nofollow'
  }
  return 'index, follow'
}
