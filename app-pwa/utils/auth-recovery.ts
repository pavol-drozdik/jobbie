import { normalizeSiteUrl } from '~/utils/seo-config'

export type RecoveryHandoffParams = {
  tokenHash?: string
  type?: string
  code?: string
}

function readQueryParam(
  query: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const raw = query?.[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed || undefined
}

/** Parses Supabase recovery handoff params from route query (and hash on client). */
export function readRecoveryHandoffFromRoute(route?: {
  query?: Record<string, unknown>
}): RecoveryHandoffParams {
  const tokenHash = readQueryParam(route?.query, 'token_hash')
  const type = readQueryParam(route?.query, 'type')
  const code = readQueryParam(route?.query, 'code')
  return { tokenHash, type, code }
}

/** Removes sensitive recovery params from the address bar after session bootstrap. */
export function stripRecoveryParamsFromUrl(): void {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  const keys = ['code', 'token_hash', 'type', 'error', 'error_description', 'error_code']
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (url.hash.includes('type=recovery') || url.hash.includes('access_token=')) {
    url.hash = ''
    changed = true
  }
  if (!changed) {
    return
  }
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}

/** True when the URL carries a Supabase password-recovery handoff (hash or query). */
export function isAuthRecoveryInUrl(route?: {
  query?: Record<string, unknown>
}): boolean {
  if (import.meta.client && typeof window !== 'undefined') {
    if (window.location.hash.includes('type=recovery')) {
      return true
    }
  }
  const handoff = readRecoveryHandoffFromRoute(route)
  if (handoff.type === 'recovery' && (handoff.tokenHash || handoff.code)) {
    return true
  }
  return handoff.type === 'recovery'
}

export const AUTH_RESET_PASSWORD_PATH = '/auth/reset-password'

/** Canonical PWA origin for Supabase `redirectTo` (Site URL env, else live browser origin). */
export function resolveAuthRedirectOrigin(siteUrl?: string): string {
  const canonical = normalizeSiteUrl(siteUrl ?? '')
  if (canonical) return canonical
  if (import.meta.client && typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

/** Shared flag: Nest profile fetch must not sign the user out during recovery. */
export const AUTH_RECOVERY_SKIP_PROFILE_KEY = 'auth-recovery-skip-profile'

export function isPasswordRecoveryRoute(path?: string): boolean {
  const p =
    path ??
    (import.meta.client && typeof window !== 'undefined'
      ? window.location.pathname
      : '')
  const normalized = p.replace(/\/$/, '') || '/'
  return normalized === AUTH_RESET_PASSWORD_PATH
}

export function setPasswordRecoverySkipProfile(skip: boolean): void {
  useState(AUTH_RECOVERY_SKIP_PROFILE_KEY, () => false).value = skip
}

export const AUTH_LOGIN_BOOTSTRAP_KEY = 'auth-login-bootstrap'

export function setAuthLoginBootstrap(active: boolean): void {
  useState(AUTH_LOGIN_BOOTSTRAP_KEY, () => false).value = active
}

export function isAuthLoginBootstrap(): boolean {
  return useState(AUTH_LOGIN_BOOTSTRAP_KEY, () => false).value
}

export function isAuthLoginRoute(path?: string): boolean {
  const p =
    path ??
    (import.meta.client && typeof window !== 'undefined'
      ? window.location.pathname
      : '')
  const normalized = p.replace(/\/$/, '') || '/'
  return (
    normalized === '/auth/login' ||
    normalized === '/auth/mfa' ||
    normalized === '/auth/register'
  )
}

/** OAuth / email-confirm return path — avoid auth plugin sign-out during PKCE handoff. */
export function isAuthCallbackRoute(path?: string): boolean {
  const p =
    path ??
    (import.meta.client && typeof window !== 'undefined'
      ? window.location.pathname
      : '')
  const normalized = p.replace(/\/$/, '') || '/'
  return normalized === '/auth/callback'
}

/** Skip plugin-driven /auth/me fetch (and sign-out on 401) during login/recovery handoff. */
export function shouldSkipAuthPluginProfileFetch(): boolean {
  if (useState(AUTH_LOGIN_BOOTSTRAP_KEY, () => false).value) {
    return true
  }
  if (useState(AUTH_RECOVERY_SKIP_PROFILE_KEY, () => false).value) {
    return true
  }
  if (isPasswordRecoveryRoute()) {
    return true
  }
  if (isAuthCallbackRoute()) {
    return true
  }
  return isAuthLoginRoute()
}

export function shouldSkipProfileFetchForRecovery(): boolean {
  if (useState(AUTH_RECOVERY_SKIP_PROFILE_KEY, () => false).value) {
    return true
  }
  return isPasswordRecoveryRoute()
}
