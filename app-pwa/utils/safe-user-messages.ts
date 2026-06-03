import type { ApiResultLike } from '~/utils/api-errors'
import { parseApiErrorMessage } from '~/utils/api-errors'

const ALLOWED_VALIDATION_MESSAGES = new Set([
  'Recent authentication required',
  'Nedostatok kreditov',
  'Mesačný limit sťahovania životopisov bol vyčerpaný.',
])

/**
 * Maps API errors to user-safe Slovak copy. Internal details stay in dev/Sentry only.
 */
export function parseSafeApiErrorMessage(
  res: ApiResultLike,
  fallback = 'Operácia zlyhala. Skúste to znova.',
): string {
  const raw = parseApiErrorMessage(res, '')
  if (!raw) return fallback
  if (ALLOWED_VALIDATION_MESSAGES.has(raw)) return raw
  if (raw.length <= 120 && /^[\p{L}\p{N}\s.,!?;:()\-–—'"%/+]+$/u.test(raw)) {
    return raw
  }
  return fallback
}

export function mapStripeErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const code = (error as { code?: string }).code
  if (typeof code === 'string' && code === 'card_declined') {
    return 'Platba kartou bola zamietnutá. Skúste inú kartu.'
  }
  const type = (error as { type?: string }).type
  if (type === 'card_error' || type === 'validation_error') {
    return 'Skontrolujte údaje karty a skúste znova.'
  }
  return fallback
}

export function mapGenericErrorMessage(
  error: unknown,
  fallback = 'Nastala chyba. Skúste to znova.',
): string {
  if (import.meta.dev && error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return fallback
}
