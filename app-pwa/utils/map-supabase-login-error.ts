import { S } from '~/utils/strings'

const GENERIC_LOGIN_ERROR =
  'Nesprávny e-mail alebo heslo. Skontrolujte údaje a skúste znova.'

function isCaptchaLoginError(code?: string | null, message?: string | null): boolean {
  const msg = (message ?? '').toLowerCase()
  return code === 'captcha_failed' || msg.includes('captcha')
}

/** Maps Supabase Auth error codes to user-facing Slovak copy (no email enumeration). */
export function mapSupabaseLoginError(
  code?: string | null,
  message?: string | null,
): string {
  if (isCaptchaLoginError(code, message)) {
    return S.forgotPasswordCaptchaFailed
  }
  switch (code) {
    case 'email_not_confirmed':
      return S.loginEmailNotConfirmed
    case 'invalid_credentials':
    case 'invalid_grant':
      return GENERIC_LOGIN_ERROR
    default:
      return GENERIC_LOGIN_ERROR
  }
}

export { GENERIC_LOGIN_ERROR, isCaptchaLoginError }
