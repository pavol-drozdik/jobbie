import { formatPasskeyVerificationFailedMessage } from '~/utils/passkey-webauthn-context'

/** Maps Supabase GoTrue passkey / WebAuthn errors to user-facing Slovak copy. */
export function formatPasskeyAuthError(message: string | undefined): string {
  const raw = message?.trim() ?? ''
  if (!raw) {
    return 'Operácia s passkey zlyhala.'
  }
  const lower = raw.toLowerCase()
  if (
    lower.includes('passkeys are disabled') ||
    (lower.includes('webauthn') && lower.includes('disabled'))
  ) {
    return (
      'Passkeys sú v Supabase projekte vypnuté. V Dashboarde: Authentication → Multi-Factor Authentication → ' +
      'WebAuthn / Passkeys nastavte na **Enabled** (nie len Verify Enabled) a uložte. Viac: supabase/AUTH-PASSKEYS.md.'
    )
  }
  if (lower.includes('missing sub claim')) {
    return 'Session vypršala. Obnovte stránku alebo sa znova prihláste heslom.'
  }
  if (
    lower.includes('credential verification failed') ||
    lower.includes('webauthn_verification_failed') ||
    (lower.includes('verification') && lower.includes('failed'))
  ) {
    const hint = import.meta.client
      ? formatPasskeyVerificationFailedMessage(
          window.location.hostname,
          window.location.origin,
        )
      : 'Overenie passkey zlyhalo. Skontrolujte Supabase Passkeys — supabase/AUTH-PASSKEYS.md.'
    if (import.meta.dev && raw && !hint.includes(raw)) {
      return `${hint} (${raw})`
    }
    return hint
  }
  if (lower.includes('insufficient_aal') || (lower.includes('aal') && lower.includes('required'))) {
    return 'Pred pridaním passkey dokončite dvojfaktorové overenie (kód z autentifikačnej aplikácie).'
  }
  return raw
}

/** Maps Supabase GoTrue MFA errors to user-facing Slovak copy. */
export function formatMfaAuthError(message: string | undefined): string {
  const raw = message?.trim() ?? ''
  if (!raw) {
    return 'Operácia MFA zlyhala.'
  }
  const lower = raw.toLowerCase()
  if (lower.includes('mfa enroll is disabled for totp')) {
    return (
      'V Supabase Dashboarde je TOTP nastavené na „Verify Enabled“ — to nepovoľuje novú registráciu. ' +
      'Authentication → MFA → TOTP (App Authenticator) prepnite na **Enabled** (nie len Verify Enabled) a uložte. ' +
      'Viac: supabase/AUTH-MFA.md.'
    )
  }
  if (lower.includes('missing sub claim')) {
    return 'Session vypršala. Obnovte stránku alebo sa znova prihláste heslom.'
  }
  if (
    lower.includes('insufficient_aal') ||
    (lower.includes('aal') && (lower.includes('insufficient') || lower.includes('required')))
  ) {
    return 'Pre túto operáciu zadajte aktuálny 6-miestny kód z autentifikačnej aplikácie.'
  }
  if (lower.includes('friendly name') && lower.includes('already exists')) {
    return (
      'Registrácia TOTP už bola začatá. Obnovte stránku a dokončite overenie kódom, ' +
      'alebo použite „Znova vygenerovať QR“.'
    )
  }
  return raw
}
