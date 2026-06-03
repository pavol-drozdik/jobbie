/** Nest API origin without trailing `/api` (matches useApi / useBffSession). */
export function normalizePublicApiBase(raw: string | undefined): string {
  let base = (raw ?? '').trim()
  if (!base) {
    base = 'http://localhost:8000'
  }
  base = base.replace(/\/+$/, '')
  if (base.toLowerCase().endsWith('/api')) {
    base = base.replace(/\/api$/i, '')
  }
  return base
}

/**
 * Browser API base. In dev, when `NUXT_PUBLIC_API_BASE_URL` points at another port
 * (e.g. :8000), use the PWA origin so Vite proxies `/api` and `jb_*` cookies work.
 */
export function resolvePublicApiBase(raw: string | undefined): string {
  const configured = normalizePublicApiBase(raw)
  if (!import.meta.client || !import.meta.dev) {
    return configured
  }
  try {
    if (new URL(configured).origin !== window.location.origin) {
      return window.location.origin
    }
  } catch {
    /* keep configured */
  }
  return configured
}

export function isPublicApiSameOriginAsPage(apiBase: string): boolean {
  if (!import.meta.client) {
    return false
  }
  try {
    return new URL(normalizePublicApiBase(apiBase)).origin === window.location.origin
  } catch {
    return false
  }
}

export function apiUrl(base: string, path: string): string {
  const normalized = resolvePublicApiBase(base)
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`
}
