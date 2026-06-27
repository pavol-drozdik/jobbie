import { S } from '~/utils/strings'

export type SupabaseAuthUrlError = {
  error: string
  errorCode?: string
  errorDescription?: string
}

export type AuthCallbackErrorDestination = 'login' | 'register'

export type MappedAuthCallbackError = {
  message: string
  destination: AuthCallbackErrorDestination
}

const AUTH_ERROR_PARAM_KEYS = ['error', 'error_code', 'error_description', 'sb'] as const

function isSignupProfileFailure(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('database error saving new user') ||
    /individual_registration_minimum_age/i.test(text) ||
    /individual_registration_(requires|invalid)_birth_date/i.test(text)
  )
}

/** Reads Supabase OAuth/OTP failure params from query or hash. */
export function readSupabaseAuthErrorFromSearchParams(
  params: URLSearchParams,
): SupabaseAuthUrlError | null {
  const error = params.get('error')?.trim()
  if (!error) return null
  return {
    error,
    errorCode: params.get('error_code')?.trim() || undefined,
    errorDescription: params.get('error_description')?.trim() || undefined,
  }
}

/** Reads Supabase auth error params from a full URL (query first, then hash). */
export function readSupabaseAuthErrorFromUrl(href?: string): SupabaseAuthUrlError | null {
  const resolved =
    href ??
    (import.meta.client && typeof window !== 'undefined' ? window.location.href : '')
  if (!resolved) return null

  const url = new URL(resolved)
  const fromQuery = readSupabaseAuthErrorFromSearchParams(url.searchParams)
  if (fromQuery) return fromQuery

  const hash = url.hash.replace(/^#/, '').trim()
  if (!hash) return null
  return readSupabaseAuthErrorFromSearchParams(new URLSearchParams(hash))
}

/** Maps Supabase callback errors to user-facing copy and login vs register redirect. */
export function mapSupabaseAuthCallbackError(
  error?: string | null,
  errorCode?: string | null,
  errorDescription?: string | null,
  message?: string | null,
): MappedAuthCallbackError {
  const parts = [errorDescription, message, error, errorCode]
    .map((v) => (v ?? '').trim())
    .filter(Boolean)
  const combined = parts.join(' ')

  if (isSignupProfileFailure(combined)) {
    return { message: S.authSignupDatabaseFailed, destination: 'register' }
  }

  const description = (errorDescription ?? message ?? '').trim()
  if (description) {
    return { message: description, destination: 'login' }
  }

  const err = (error ?? '').trim().toLowerCase()
  if (err === 'access_denied') {
    return { message: S.authOAuthCancelled, destination: 'login' }
  }

  if ((errorCode ?? '').trim() === 'unexpected_failure' || err === 'server_error') {
    return { message: S.authOAuthFailed, destination: 'login' }
  }

  return { message: S.authOAuthFailed, destination: 'login' }
}

/** Removes Supabase auth error params from the address bar (query and hash). */
export function stripSupabaseAuthErrorFromUrl(): void {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  let changed = false

  for (const key of AUTH_ERROR_PARAM_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }

  const hashRaw = url.hash.replace(/^#/, '').trim()
  if (hashRaw) {
    const hashParams = new URLSearchParams(hashRaw)
    let hashChanged = false
    for (const key of AUTH_ERROR_PARAM_KEYS) {
      if (hashParams.has(key)) {
        hashParams.delete(key)
        hashChanged = true
      }
    }
    if (hashChanged) {
      const remaining = hashParams.toString()
      url.hash = remaining ? `#${remaining}` : ''
      changed = true
    }
  }

  if (!changed) return
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}
