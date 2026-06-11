/** Bare domain for WebAuthn RP ID (no scheme, port, or path). */
export function resolvePasskeyRpId(hostname: string): string {
  const host = hostname.trim().toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return host === '[::1]' ? 'localhost' : host
  }
  const parts = host.split('.').filter(Boolean)
  if (parts.length >= 2) {
    return parts.slice(-2).join('.')
  }
  return host
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}

/** Dev-only checklist text after WebAuthn verification fails (not a pre-flight block). */
export function passkeyLocalDevSetupHint(hostname: string, origin: string): string {
  const rpId = resolvePasskeyRpId(hostname)
  return (
    `Lokálny vývoj: v Supabase Dashboard → Authentication → Passkeys nastavte Relying Party ID na „${rpId}“ ` +
    `a Allowed origins na presne „${origin}“ (vrátane portu). Neprepínajte medzi localhost a 127.0.0.1. ` +
    'Viac: supabase/AUTH-PASSKEYS.md.'
  )
}

export function formatPasskeyVerificationFailedMessage(
  hostname: string,
  origin: string,
): string {
  if (isLoopbackHost(hostname)) {
    return passkeyLocalDevSetupHint(hostname, origin)
  }
  const rpId = resolvePasskeyRpId(hostname)
  return (
    'Overenie passkey na serveri zlyhalo (WebAuthn). V Supabase Dashboard → Authentication → Passkeys skontrolujte: ' +
    `Relying Party ID = „${rpId}“ (bez https:// a portu), Allowed origins obsahuje „${origin}“. ` +
    'Používajte stále rovnakú URL (localhost alebo 127.0.0.1, nie oboje). Viac: supabase/AUTH-PASSKEYS.md.'
  )
}
