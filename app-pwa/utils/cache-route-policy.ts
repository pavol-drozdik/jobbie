/**
 * Document (HTML) cache policy for Nitro route rules and server middleware.
 */

import { pathShouldNoindex } from './seo-route-policy'

export const PRIVATE_DOCUMENT_CACHE_CONTROL =
  'private, no-store, must-revalidate' as const

/**
 * Cloudflare edge cache only (ignored by browsers). Prevents `max-age=14400`
 * from replacing origin `Cache-Control` on CSR auth/CV routes.
 */
export const PRIVATE_CDN_CACHE_CONTROL = 'no-store' as const

/** Short CDN-friendly cache for public SSR marketing/catalog shells. */
export const PUBLIC_DOCUMENT_CACHE_CONTROL =
  'public, max-age=300, must-revalidate' as const

export const PRIVATE_DOCUMENT_CACHE_HEADERS = {
  'cache-control': PRIVATE_DOCUMENT_CACHE_CONTROL,
  'cdn-cache-control': PRIVATE_CDN_CACHE_CONTROL,
} as const

export const PUBLIC_DOCUMENT_CACHE_HEADERS = {
  'cache-control': PUBLIC_DOCUMENT_CACHE_CONTROL,
} as const

function normalizePath(pathname: string): string {
  const pathOnly = pathname.split('?')[0] ?? pathname
  if (pathOnly.length > 1 && pathOnly.endsWith('/')) {
    return pathOnly.slice(0, -1)
  }
  return pathOnly
}

/** Public candidate profile pages are noindex=false; do not force no-store on them. */
function isPublicProfileSlugPath(path: string): boolean {
  return path.startsWith('/profil/') && path.length > '/profil/'.length
}

/** Static build assets use content-hashed filenames and long immutable cache. */
export function isStaticAssetPath(path: string): boolean {
  return (
    path.startsWith('/_nuxt/')
    || path.startsWith('/_ipx/')
    || path.startsWith('/assets/')
  )
}

/**
 * True for authenticated / account HTML documents that must not be stored
 * in shared or private HTTP caches (auth, settings, CV editor, chat, …).
 */
export function pathRequiresPrivateNoStore(pathname: string): boolean {
  const path = normalizePath(pathname)
  if (isStaticAssetPath(path)) return false
  if (!pathShouldNoindex(path)) return false
  if (isPublicProfileSlugPath(path)) return false
  return true
}
