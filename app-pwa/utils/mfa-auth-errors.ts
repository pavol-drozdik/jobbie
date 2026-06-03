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
  if (lower.includes('friendly name') && lower.includes('already exists')) {
    return (
      'Registrácia TOTP už bola začatá. Obnovte stránku a dokončite overenie kódom, ' +
      'alebo použite „Znova vygenerovať QR“.'
    )
  }
  return raw
}
