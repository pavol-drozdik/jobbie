/** Maps Supabase / admin API auth errors to Slovak copy (no email enumeration). */
export function mapAdminLoginError(
  code?: string | null,
  message?: string | null,
): string {
  const msg = (message ?? '').toLowerCase()

  switch (code) {
    case 'email_not_confirmed':
      return 'E-mail nie je overený. Skontrolujte schránku alebo sa prihláste cez hlavnú aplikáciu.'
    case 'captcha_failed':
      return 'Overenie CAPTCHA zlyhalo. Dokončite Turnstile a skúste znova.'
    case 'invalid_credentials':
    case 'invalid_grant':
      return 'Nesprávny e-mail alebo heslo.'
    case 'user_banned':
      return 'Účet je zablokovaný. Kontaktujte podporu.'
    case 'over_request_rate_limit':
    case 'too_many_requests':
      return 'Príliš veľa pokusov. Počkajte chvíľu a skúste znova.'
    case 'missing_anon_key':
      return 'V api/.env chýba SUPABASE_ANON_KEY (anon kľúč z PWA, nie service role).'
    case 'no_session':
      return 'Prihlásenie nevrátilo platnú reláciu. Skúste znova.'
    default:
      if (msg.includes('captcha')) {
        return 'Supabase vyžaduje CAPTCHA. Pridajte VITE_TURNSTILE_SITE_KEY do app/.env (rovnaký kľúč ako PWA) a dokončite Turnstile.'
      }
      if (msg.includes('invalid api key') || msg.includes('api key')) {
        return 'Neplatný Supabase anon kľúč v api/.env (použite anon, nie service role).'
      }
      if (msg.includes('email') && msg.includes('confirm')) {
        return 'E-mail nie je overený. Skontrolujte schránku.'
      }
      if (msg.includes('banned')) {
        return 'Účet je zablokovaný.'
      }
      if (msg.includes('fetch') || msg.includes('network')) {
        return 'Nepodarilo sa spojiť so Supabase. Skontrolujte SUPABASE_URL v api/.env.'
      }
      if (import.meta.env.DEV && message?.trim()) {
        return `Prihlásenie zlyhalo (${code ?? 'auth'}): ${message.trim()}`
      }
      return 'Prihlásenie zlyhalo. Skontrolujte e-mail, heslo a api/.env (SUPABASE_ANON_KEY).'
  }
}

export function parseAdminLoginApiError(
  status: number,
  body: string,
): { message: string; code: string | null } {
  if (status === 0) {
    return {
      code: 'api_unreachable',
      message: import.meta.env.DEV
        ? 'Admin API nedostupné. Spustite npm run dev:api alebo npm run dev.'
        : 'Admin API nedostupné na http://127.0.0.1:3099. Reštartujte aplikáciu; ak problém pretrváva, preinštalujte build z GitHub Releases.',
    }
  }
  try {
    const parsed = JSON.parse(body) as {
      message?: string | { message?: string; code?: string }
      code?: string
      error?: string
    }
    let code: string | null = parsed.code ?? null
    let rawMessage = ''
    if (typeof parsed.message === 'string') {
      rawMessage = parsed.message
      code = code ?? parsed.error ?? null
    } else if (parsed.message && typeof parsed.message === 'object') {
      rawMessage = parsed.message.message ?? ''
      code = parsed.message.code ?? code
    }
    return {
      code,
      message: mapAdminLoginError(code, rawMessage || body),
    }
  } catch {
    return { code: null, message: mapAdminLoginError(null, body) }
  }
}
