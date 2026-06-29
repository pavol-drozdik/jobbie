import { S } from '~/utils/strings'

/** Maps Supabase Auth errors during password reset to Slovak user-facing copy. */
export function mapSupabaseResetError(
  code?: string | null,
  message?: string | null,
  context: 'reset' | 'settings' = 'reset',
): string {
  const normalizedCode = (code ?? '').toLowerCase()
  const msg = (message ?? '').toLowerCase()

  switch (normalizedCode) {
    case 'weak_password':
    case 'password_too_short':
      return S.resetPasswordWeakPassword
    case 'same_password':
      return S.resetPasswordSamePassword
    case 'session_not_found':
    case 'session_expired':
    case 'flow_state_expired':
    case 'otp_expired':
    case 'invalid_grant':
      return S.resetPasswordExpired
    case 'reauthentication_needed':
      return context === 'settings'
        ? S.settingsReauthenticationNeeded
        : S.resetPasswordReauthRequired
    default:
      break
  }

  if (msg.includes('at least') && msg.includes('character')) {
    return S.resetPasswordWeakPassword
  }
  if (msg.includes('same') && msg.includes('password')) {
    return S.resetPasswordSamePassword
  }
  if (
    msg.includes('expired') ||
    msg.includes('invalid') && msg.includes('token') ||
    msg.includes('invalid') && msg.includes('session')
  ) {
    return S.resetPasswordExpired
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return S.resetPasswordNetworkError
  }
  if (
    msg.includes('session') && msg.includes('missing') ||
    msg.includes('not authenticated') ||
    msg.includes('jwt')
  ) {
    return S.resetPasswordExpired
  }

  return S.resetPasswordSaveFailed
}

function isPkceVerifierMissing(code?: string | null, message?: string | null): boolean {
  const normalizedCode = (code ?? '').toLowerCase()
  const msg = (message ?? '').toLowerCase()
  return (
    normalizedCode === 'pkce_code_verifier_missing' ||
    (msg.includes('code') && msg.includes('verifier')) ||
    msg.includes('both auth code and code verifier') ||
    msg.includes('pkce code verifier not found')
  )
}

/** Maps errors from verifyOtp during recovery link open. */
export function mapSupabaseRecoveryVerifyError(
  code?: string | null,
  message?: string | null,
): string {
  if (isPkceVerifierMissing(code, message)) {
    return S.resetPasswordPkceVerifierMissing
  }
  return mapSupabaseRecoveryExchangeError(code, message)
}

/** Maps errors from exchangeCodeForSession during recovery link open. */
export function mapSupabaseRecoveryExchangeError(
  code?: string | null,
  message?: string | null,
): string {
  const normalizedCode = (code ?? '').toLowerCase()
  const msg = (message ?? '').toLowerCase()
  if (isPkceVerifierMissing(code, message)) {
    return S.resetPasswordPkceVerifierMissing
  }
  if (
    normalizedCode === 'flow_state_expired' ||
    normalizedCode === 'otp_expired' ||
    normalizedCode === 'invalid_grant' ||
    normalizedCode === 'access_denied'
  ) {
    return S.resetPasswordExpired
  }
  if (msg.includes('invalid flow state')) {
    return S.resetPasswordExpired
  }

  return S.resetPasswordExpired
}
