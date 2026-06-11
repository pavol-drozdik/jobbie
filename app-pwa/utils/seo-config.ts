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

export const SEO_DEFAULT_TITLE = 'Nájdi prácu. Nájdi pomoc.'
export const SEO_DEFAULT_DESCRIPTION =
  'Jobbie spája uchádzačov s firmami na Slovensku — brigády, sezónne práce (kosenie trávy, pomoc v záhrade), pracovné ponuky a služby profesionálov.'
/** Matches `BRAND_ICON_512_PATH` in `brand-assets.ts` (no alias — safe for `nuxt.config` jiti). */
export const SEO_DEFAULT_OG_IMAGE_PATH = '/icon-512.png'
export const SEO_BRAND_SUFFIX = 'JOBBIE'

/** @deprecated Use `SEO_PUBLIC_SSR_ROUTE_PATTERNS` */
export const SEO_PUBLIC_SSR_ROUTES = SEO_PUBLIC_SSR_ROUTE_PATTERNS

export function robotsMetaContent(allowIndexing: boolean, pathname: string): string {
  if (!allowIndexing || pathShouldNoindex(pathname)) {
    return 'noindex, nofollow'
  }
  return 'index, follow'
}
