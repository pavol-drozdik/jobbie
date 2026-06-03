/** True when the URL carries a Supabase password-recovery handoff (hash or query). */
export function isAuthRecoveryInUrl(route?: {
  query?: Record<string, unknown>
}): boolean {
  if (import.meta.client && typeof window !== 'undefined') {
    if (window.location.hash.includes('type=recovery')) {
      return true
    }
  }
  const t = route?.query?.type
  const type = Array.isArray(t) ? t[0] : t
  return type === 'recovery'
}

export const AUTH_RESET_PASSWORD_PATH = '/auth/reset-password'

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
  return isAuthLoginRoute()
}

export function shouldSkipProfileFetchForRecovery(): boolean {
  if (useState(AUTH_RECOVERY_SKIP_PROFILE_KEY, () => false).value) {
    return true
  }
  return isPasswordRecoveryRoute()
}
