import { S } from '~/utils/strings'

/**
 * Maps Supabase `resetPasswordForEmail` errors to user-facing copy.
 * Returns `null` when the UI should show the generic “check your email” success state
 * (unknown email / no enumeration).
 */
export function mapSupabaseForgotPasswordError(
  code?: string | null,
  message?: string | null,
): string | null {
  const msg = (message ?? '').toLowerCase()

  switch (code) {
    case 'over_email_send_rate_limit':
      return S.forgotPasswordRateLimited
    case 'captcha_failed':
      return S.forgotPasswordCaptchaFailed
    case 'validation_failed':
      if (msg.includes('captcha')) {
        return S.forgotPasswordCaptchaFailed
      }
      if (msg.includes('email') && msg.includes('invalid')) {
        return S.forgotPasswordInvalidEmail
      }
      if (msg.includes('redirect')) {
        return S.forgotPasswordSendFailed
      }
      return null
    case 'unexpected_failure':
      return S.forgotPasswordSendFailed
    default:
      if (msg.includes('captcha')) {
        return S.forgotPasswordCaptchaFailed
      }
      if (
        msg.includes('timed out') ||
        msg.includes('timeout') ||
        msg.includes('deadline exceeded') ||
        msg.includes('retry after a moment')
      ) {
        return S.forgotPasswordSmtpTimeout
      }
      if (msg.includes('rate limit') || msg.includes('too many')) {
        return S.forgotPasswordRateLimited
      }
      return null
  }
}
