export type CookieConsentPayload = {
  v: 1
  analytics: boolean
  ts: string
}

export const CONSENT_COOKIE_NAME = 'jb_consent'
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 182

let analyticsGranted = false

/** In-memory mirror updated by store + boot plugin (for sync reads in analytics clients). */
export function setAnalyticsConsentGranted(value: boolean): void {
  analyticsGranted = value
}

export function isAnalyticsConsentGranted(): boolean {
  return analyticsGranted
}

export function parseConsentCookie(raw: string | null | undefined): CookieConsentPayload | null {
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentPayload>
    if (parsed.v === 1 && typeof parsed.analytics === 'boolean' && typeof parsed.ts === 'string') {
      return parsed as CookieConsentPayload
    }
  } catch {
    /* ignore */
  }
  return null
}
