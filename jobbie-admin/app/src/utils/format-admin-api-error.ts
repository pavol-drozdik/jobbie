export type AdminApiErrorHints = {
  needsReLogin: boolean
}

export function formatAdminApiError(
  status: number,
  body: string,
): { message: string; hints: AdminApiErrorHints } {
  const hints: AdminApiErrorHints = { needsReLogin: false }
  let message = body.slice(0, 280) || `HTTP ${status}`

  if (status === 403) {
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] }
      const raw = parsed.message
      const msg = Array.isArray(raw) ? raw.join(' ') : (raw ?? '')
      const lower = msg.toLowerCase()

      if (lower.includes('recent login')) {
        hints.needsReLogin = true
        return {
          message:
            'Platnosť nedávneho prihlásenia vypršala. Odhláste sa a znova sa prihláste s MFA (TOTP), potom skúste akciu znova.',
          hints,
        }
      }
      if (lower.includes('aal2') || lower.includes('mfa')) {
        return {
          message:
            'Vyžaduje sa admin MFA (AAL2). Odhláste sa a prihláste sa znova s TOTP kódom.',
          hints: { needsReLogin: true },
        }
      }
      if (msg.includes('moderation')) {
        return {
          message:
            'Účet nemá oprávnenie moderácie (admin_role analyst alebo chýbajúci app_role = admin).',
          hints,
        }
      }
      if (lower.includes('insufficient application role')) {
        return {
          message:
            'Účet nemá profiles.app_role = admin. Prihlásenie do admin aplikácie nie je povolené.',
          hints,
        }
      }
      if (msg) {
        message = msg
      }
    } catch {
      /* keep slice */
    }
    if (!hints.needsReLogin && message === body.slice(0, 280)) {
      message =
        'Prístup zamietnutý (403). Skontrolujte admin_role, MFA (AAL2) alebo nedávne prihlásenie.'
    }
  }

  return { message, hints }
}
