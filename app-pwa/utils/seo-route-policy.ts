/**
 * Central indexability policy for public routes (used by usePageSeo, sitemap, route rules).
 */

import { parseLegalPublished } from './seo-config'

export type SeoRoutePolicy = {
  /** Allow index,follow when NUXT_PUBLIC_ALLOW_INDEXING is on */
  indexable: boolean
  includeInSitemap: boolean
  ssr: boolean
}

export const SEO_LEGAL_PATHS = ['/vseobecne-podmienky', '/ochrana-osobnych-udajov'] as const

const INDEXABLE_STATIC: Record<string, SeoRoutePolicy> = {
  '/': { indexable: true, includeInSitemap: true, ssr: true },
  '/pracovne-ponuky': { indexable: true, includeInSitemap: true, ssr: true },
  '/zahranicne-pracovne-ponuky': { indexable: true, includeInSitemap: true, ssr: true },
  '/profesionali': { indexable: true, includeInSitemap: true, ssr: true },
  '/cennik': { indexable: true, includeInSitemap: true, ssr: true },
  '/blog': { indexable: true, includeInSitemap: true, ssr: true },
  '/bezpecnost': { indexable: true, includeInSitemap: true, ssr: true },
  '/ponuky-na-email': { indexable: true, includeInSitemap: true, ssr: true },
  '/databaza-zivotopisov': { indexable: false, includeInSitemap: false, ssr: true },
  '/profil': { indexable: false, includeInSitemap: false, ssr: false },
}

function legalRoutePolicy(legalPublished: boolean): SeoRoutePolicy {
  return legalPublished
    ? { indexable: true, includeInSitemap: true, ssr: true }
    : { indexable: false, includeInSitemap: false, ssr: true }
}

function buildExactMap(legalPublished: boolean): Record<string, SeoRoutePolicy> {
  const exact: Record<string, SeoRoutePolicy> = { ...INDEXABLE_STATIC }
  for (const path of SEO_LEGAL_PATHS) {
    exact[path] = legalRoutePolicy(legalPublished)
  }
  return exact
}

const buildTimeLegalPublished = parseLegalPublished(process.env.NUXT_PUBLIC_LEGAL_PUBLISHED)
const EXACT = buildExactMap(buildTimeLegalPublished)

const PREFIX: Array<{ prefix: string; policy: SeoRoutePolicy }> = [
  { prefix: '/ponuka/', policy: { indexable: true, includeInSitemap: false, ssr: true } },
  { prefix: '/profesionali/', policy: { indexable: true, includeInSitemap: false, ssr: true } },
  { prefix: '/profil/', policy: { indexable: true, includeInSitemap: false, ssr: true } },
  { prefix: '/blog/', policy: { indexable: true, includeInSitemap: false, ssr: true } },
  { prefix: '/auth', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/nastavenia', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/platba', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/chat', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/dashboard', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/zivotopisy', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/vytvorit-ponuku', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/vytvorit-zahranicnu-ponuku', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/spravca-uchadzacov', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/moje-reklamy', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/app', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/unsubscribe', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/preferences', policy: { indexable: false, includeInSitemap: false, ssr: false } },
  { prefix: '/ponuky-na-email/', policy: { indexable: false, includeInSitemap: false, ssr: false } },
]

const DEFAULT_NOINDEX: SeoRoutePolicy = {
  indexable: false,
  includeInSitemap: false,
  ssr: false,
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

export function isLegalSeoPath(pathname: string): boolean {
  return (SEO_LEGAL_PATHS as readonly string[]).includes(normalizePath(pathname))
}

export function getSeoRoutePolicy(pathname: string, legalPublished?: boolean): SeoRoutePolicy {
  const path = normalizePath(pathname)
  if (path.includes('/print/')) {
    return DEFAULT_NOINDEX
  }
  if (legalPublished !== undefined && isLegalSeoPath(path)) {
    return legalRoutePolicy(legalPublished)
  }
  const exact = EXACT[path]
  if (exact) {
    return exact
  }
  for (const { prefix, policy } of PREFIX) {
    if (path === prefix.replace(/\/$/, '') || path.startsWith(prefix)) {
      return policy
    }
  }
  return DEFAULT_NOINDEX
}

export function pathShouldNoindex(pathname: string, legalPublished?: boolean): boolean {
  return !getSeoRoutePolicy(pathname, legalPublished).indexable
}

export function pathIncludeInSitemap(pathname: string, legalPublished?: boolean): boolean {
  return getSeoRoutePolicy(pathname, legalPublished).includeInSitemap
}

/** Static paths for sitemap.xml at runtime (respects legal publish flag). */
export function getSeoSitemapStaticPaths(legalPublished: boolean): readonly string[] {
  return Object.entries(buildExactMap(legalPublished))
    .filter(([, policy]) => policy.includeInSitemap)
    .map(([path]) => path)
}

/** Build-time static paths (matches nuxt.config route rules). */
export const SEO_SITEMAP_STATIC_PATHS: readonly string[] = getSeoSitemapStaticPaths(
  buildTimeLegalPublished,
)

export const SEO_PUBLIC_SSR_ROUTE_PATTERNS: readonly string[] = [
  ...Object.entries(EXACT)
    .filter(([, policy]) => policy.ssr)
    .map(([path]) => path),
  '/ponuka/**',
  '/profesionali/**',
  '/profil/**',
  '/blog/**',
]

/** Nitro routeRules: noindex patterns when indexing is enabled. */
export const SEO_NOINDEX_ROUTE_PATTERNS: readonly string[] = [
  '/auth/**',
  '/nastavenia/**',
  '/nastavenia',
  '/platba/**',
  '/platba',
  '/chat/**',
  '/chat',
  '/messages/**',
  '/dashboard/**',
  '/zivotopisy/**',
  '/zivotopisy',
  '/vytvorit-ponuku/**',
  '/vytvorit-zahranicnu-ponuku/**',
  '/spravca-uchadzacov/**',
  '/moje-reklamy/**',
  '/app/**',
  '/unsubscribe/**',
  '/preferences/**',
  '/databaza-zivotopisov',
  '/ponuky-na-email/**',
  '/profil',
  ...(buildTimeLegalPublished ? [] : SEO_LEGAL_PATHS),
]
