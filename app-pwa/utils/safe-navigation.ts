/**
 * Safe in-app navigation and external link helpers (UX layer only).
 * Backend must still validate URLs on write and for push/notification payloads.
 */

const UNSAFE_SCHEME_RE = /^(javascript|data|vbscript|file|blob):/i
const BACKSLASH_RE = /[\\]/
const PROTOCOL_RELATIVE_RE = /^\/\//

export type SanitizeExternalHrefOptions = {
  allowHttp?: boolean
  allowMailto?: boolean
  allowTel?: boolean
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function hasUnsafeEncodedSlash(path: string): boolean {
  const lower = path.toLowerCase()
  return (
    lower.includes('%2f%2f') ||
    lower.includes('%5c%5c') ||
    lower.includes('%2f%5c') ||
    lower.includes('%5c%2f') ||
    lower.includes('%2f\\') ||
    lower.includes('%5c/')
  )
}

function normalizeInternalPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return ''
  if (BACKSLASH_RE.test(trimmed)) return ''
  const decoded = decodePathSegment(trimmed)
  if (BACKSLASH_RE.test(decoded)) return ''
  if (PROTOCOL_RELATIVE_RE.test(decoded)) return ''
  if (UNSAFE_SCHEME_RE.test(decoded)) return ''
  if (hasUnsafeEncodedSlash(decoded)) return ''
  if (decoded.includes('@')) return ''
  return decoded
}

/**
 * Returns true when `input` is a safe same-origin relative path (no host, no scheme tricks).
 */
export function isSafeInternalPath(input: unknown): boolean {
  if (typeof input !== 'string') return false
  const trimmed = input.trim()
  if (!trimmed) return false
  if (!trimmed.startsWith('/')) return false
  return normalizeInternalPath(trimmed).length > 0
}

/**
 * Resolves a post-login / in-app redirect path. Falls back when unsafe or external.
 */
export function resolveSafeInternalPath(
  input: unknown,
  fallback = '/',
): string {
  if (typeof input !== 'string') return fallback
  const normalized = normalizeInternalPath(input)
  if (!normalized) return fallback
  return normalized
}

function stripCredentials(url: URL): boolean {
  return Boolean(url.username || url.password)
}

/**
 * Returns a safe external href or null when the URL must not be rendered as a link.
 */
export function sanitizeExternalHref(
  input: unknown,
  options: SanitizeExternalHrefOptions = {},
): string | null {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null
  if (UNSAFE_SCHEME_RE.test(raw)) return null
  if (PROTOCOL_RELATIVE_RE.test(raw)) return null
  let href = raw
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    href = `https://${href.replace(/^\/+/, '')}`
  }
  let parsed: URL
  try {
    parsed = new URL(href)
  } catch {
    return null
  }
  if (stripCredentials(parsed)) return null
  const scheme = parsed.protocol.toLowerCase()
  if (scheme === 'https:') return parsed.href
  if (scheme === 'http:' && options.allowHttp === true) return parsed.href
  if (scheme === 'mailto:' && options.allowMailto !== false) return parsed.href
  if (scheme === 'tel:' && options.allowTel !== false) return parsed.href
  return null
}

/** Normalizes company/profile website input to https when missing a scheme. */
export function normalizeWebsiteHref(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return sanitizeExternalHref(withScheme, { allowHttp: true })
}

/** Service worker — same rules as resolveSafeInternalPath (no Nuxt imports in SW). */
export function resolveSafeInternalPathForWorker(
  input: unknown,
  origin: string,
  fallback = '/',
): string {
  if (typeof input !== 'string' || !input.trim()) return fallback
  const trimmed = input.trim()
  try {
    const parsed = new URL(trimmed, origin)
    if (parsed.origin !== origin) return fallback
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return resolveSafeInternalPath(path, fallback)
  } catch {
    return resolveSafeInternalPath(trimmed, fallback)
  }
}
