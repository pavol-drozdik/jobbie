import { S } from '~/utils/strings'

const GENERIC_LOGIN_ERROR =
  'Nesprávny e-mail alebo heslo. Skontrolujte údaje a skúste znova.'

/** Maps Supabase Auth error codes to user-facing Slovak copy (no email enumeration). */
export function mapSupabaseLoginError(code?: string | null): string {
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

export { GENERIC_LOGIN_ERROR }
