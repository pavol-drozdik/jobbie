import { readCachedAuthSnapshot } from '~/utils/auth-cache'
import { readCsrfTokenFromDocument } from '~/utils/api-csrf'
import {
  isPublicApiSameOriginAsPage,
  resolvePublicApiBase,
} from '~/utils/api-base-url'
import {
  clearBffSessionHint,
  readBffSessionHint,
  writeBffSessionHint,
} from '~/utils/bff-session-hint'

/** jb_csrf is Path=/api — not visible in document.cookie on PWA routes; persist from establish/refresh body. */
const BFF_CSRF_STORAGE_KEY = 'jobbie:bff-csrf:v1'

function safeSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readStoredBffCsrfToken(): string | null {
  const storage = safeSessionStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(BFF_CSRF_STORAGE_KEY)
    return raw?.trim() || null
  } catch {
    return null
  }
}

function writeStoredBffCsrfToken(token: string): void {
  const storage = safeSessionStorage()
  if (!storage) return
  try {
    storage.setItem(BFF_CSRF_STORAGE_KEY, token)
  } catch {
    /* quota / private mode */
  }
}

function clearStoredBffCsrfToken(): void {
  const storage = safeSessionStorage()
  if (!storage) return
  try {
    storage.removeItem(BFF_CSRF_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Hydrate in-memory BFF flags from sessionStorage (survives hard refresh). */
export function hydrateBffSessionHintFromStorage(): void {
  if (!import.meta.client) return
  const storedCsrf = readStoredBffCsrfToken()
  if (storedCsrf) {
    useBffCsrfToken().value = storedCsrf
  }
  const hint = readBffSessionHint()
  if (!hint?.active) return
  if (!useBffSessionActive().value) {
    useBffSessionActive().value = true
  }
}

/** CSRF from establishSession body when jb_csrf is not readable cross-origin on document.cookie. */
export function useBffCsrfToken() {
  return useState<string | null>('bff-csrf-token', () => null)
}

/** Set after successful POST /api/auth/session; cleared on explicit logout. */
export function useBffSessionActive() {
  return useState('bff-session-active', () => false)
}

export function readBffCsrfToken(): string | null {
  const mem = useBffCsrfToken().value
  if (mem?.trim()) return mem.trim()
  const stored = readStoredBffCsrfToken()
  if (stored) {
    useBffCsrfToken().value = stored
    return stored
  }
  return readCsrfTokenFromDocument()
}

/** Nest BFF cookies established — API auth must not be wiped on Supabase SIGNED_OUT. */
export function hasActiveBffSession(): boolean {
  if (useBffSessionActive().value) return true
  if (readBffSessionHint()?.active) return true
  return Boolean(readBffCsrfToken())
}

/**
 * After BFF login, Supabase storage may be empty on reload; HttpOnly `jb_*` are not in
 * `document.cookie` (Path=/api). Restore when we have CSRF in memory/document or auth cache.
 */
export function shouldRestoreBffOnColdBoot(): boolean {
  if (!import.meta.client) return false
  if (hasActiveBffSession()) return true
  const snap = readCachedAuthSnapshot()
  return Boolean(snap?.user?.id)
}

/**
 * Prefer HttpOnly BFF cookies for Nest API when a session is active (reduces XSS token theft).
 * Explicit `options.token` on useApi still sends Bearer for step-up and legacy bootstrap.
 * Requires API calls same-origin as the PWA (production `SESSION_COOKIE_DOMAIN` or dev proxy).
 */
export function shouldPreferBffCookieAuth(_hasBearer?: boolean): boolean {
  if (!import.meta.client) return false
  if (!hasActiveBffSession()) return false
  const config = useRuntimeConfig().public
  const base = resolvePublicApiBase(String(config.apiBaseUrl ?? ''))
  return isPublicApiSameOriginAsPage(base)
}

/** After establishSession / session refresh — memory + sessionStorage for cold boot. */
export function persistBffSessionClientState(csrfToken: string): void {
  const token = csrfToken.trim()
  if (!token) return
  useBffCsrfToken().value = token
  useBffSessionActive().value = true
  writeStoredBffCsrfToken(token)
  writeBffSessionHint()
}

export function clearBffSessionClientState(): void {
  useBffCsrfToken().value = null
  useBffSessionActive().value = false
  clearStoredBffCsrfToken()
  clearBffSessionHint()
}

/** True when BFF cookies are expected but no CSRF is available for mutations. */
export function isBffSessionMissingCsrf(): boolean {
  if (!import.meta.client) return false
  if (!hasActiveBffSession()) return false
  return !readBffCsrfToken()
}

/**
 * Ensures `X-CSRF-Token` is available before a BFF cookie mutation.
 * Returns false when refresh could not restore a token.
 */
export async function ensureBffCsrfForMutation(apiBaseUrl: string): Promise<boolean> {
  if (!import.meta.client) return true
  if (!shouldPreferBffCookieAuth()) return true
  if (readBffCsrfToken()) return true
  const { refreshBffSessionSingleFlight } = await import('~/utils/bff-refresh-single-flight')
  const refreshed = await refreshBffSessionSingleFlight(apiBaseUrl)
  return refreshed.ok && Boolean(readBffCsrfToken())
}
