export const CONSENT_COOKIE_NAME = 'jb_consent'
export const CONSENT_VISITOR_COOKIE_NAME = 'jb_consent_vid'
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 182
export const CONSENT_VISITOR_MAX_AGE = 60 * 60 * 24 * 365
export const COOKIE_POLICY_VERSION = 1

export type CookieConsentCategories = {
  analytics: boolean
  marketing: boolean
  personalization: boolean
}

export type CookieConsentPayloadV1 = {
  v: 1
  analytics: boolean
  ts: string
}

export type CookieConsentPayloadV2 = {
  v: 2
  necessary: true
  analytics: boolean
  marketing: boolean
  personalization: boolean
  policy: number
  ts: string
}

export type CookieConsentPayload = CookieConsentPayloadV1 | CookieConsentPayloadV2

export type CookieConsentAction = 'accept_all' | 'reject_all' | 'save' | 'withdraw'
export type CookieConsentSource = 'banner' | 'preferences' | 'footer'

const CONSENT_COOKIE_OPTIONS = {
  maxAge: CONSENT_COOKIE_MAX_AGE,
  sameSite: 'lax' as const,
  secure: !import.meta.dev,
  path: '/',
  default: () => null as CookieConsentPayload | null,
}

const VISITOR_COOKIE_OPTIONS = {
  maxAge: CONSENT_VISITOR_MAX_AGE,
  sameSite: 'lax' as const,
  secure: !import.meta.dev,
  path: '/',
  default: () => null as string | null,
}

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
    if (parsed.v === 2) {
      const p = parsed as Partial<CookieConsentPayloadV2>
      if (
        p.necessary === true &&
        typeof p.analytics === 'boolean' &&
        typeof p.marketing === 'boolean' &&
        typeof p.personalization === 'boolean' &&
        typeof p.policy === 'number' &&
        typeof p.ts === 'string'
      ) {
        return p as CookieConsentPayloadV2
      }
      return null
    }
    if (parsed.v === 1 && typeof parsed.analytics === 'boolean' && typeof parsed.ts === 'string') {
      return parsed as CookieConsentPayloadV1
    }
  } catch {
    /* ignore */
  }
  return null
}

export function normalizeConsentPayload(
  raw: CookieConsentPayload | null | undefined,
): CookieConsentPayloadV2 | null {
  if (!raw) {
    return null
  }
  if (raw.v === 2) {
    return raw
  }
  return {
    v: 2,
    necessary: true,
    analytics: raw.analytics,
    marketing: false,
    personalization: false,
    policy: 0,
    ts: raw.ts,
  }
}

export function hasValidConsentChoice(raw: CookieConsentPayload | null | undefined): boolean {
  const normalized = normalizeConsentPayload(raw)
  if (!normalized) {
    return false
  }
  if (raw?.v === 1) {
    return true
  }
  return normalized.policy >= COOKIE_POLICY_VERSION
}

export function categoriesFromPayload(
  raw: CookieConsentPayload | null | undefined,
): CookieConsentCategories {
  const normalized = normalizeConsentPayload(raw)
  if (!normalized) {
    return { analytics: false, marketing: false, personalization: false }
  }
  return {
    analytics: normalized.analytics,
    marketing: normalized.marketing,
    personalization: normalized.personalization,
  }
}

/** Shared Nuxt cookie ref — plugin and store must use this helper only. */
export function useConsentCookieRef() {
  return useCookie<CookieConsentPayload | null>(CONSENT_COOKIE_NAME, CONSENT_COOKIE_OPTIONS)
}

export function useConsentVisitorCookieRef() {
  return useCookie<string | null>(CONSENT_VISITOR_COOKIE_NAME, VISITOR_COOKIE_OPTIONS)
}

function createVisitorId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** First-party visitor id for consent audit logging (strictly necessary). */
export function ensureConsentVisitorId(): string {
  const visitorCookie = useConsentVisitorCookieRef()
  const existing = visitorCookie.value?.trim()
  if (existing && existing.length >= 8) {
    return existing
  }
  const id = createVisitorId()
  visitorCookie.value = id
  return id
}

export function buildConsentPayload(categories: CookieConsentCategories): CookieConsentPayloadV2 {
  return {
    v: 2,
    necessary: true,
    analytics: categories.analytics,
    marketing: categories.marketing,
    personalization: categories.personalization,
    policy: COOKIE_POLICY_VERSION,
    ts: new Date().toISOString(),
  }
}

export function categoriesEqual(a: CookieConsentCategories, b: CookieConsentCategories): boolean {
  return (
    a.analytics === b.analytics &&
    a.marketing === b.marketing &&
    a.personalization === b.personalization
  )
}

export function hadOptionalConsent(categories: CookieConsentCategories): boolean {
  return categories.analytics || categories.marketing || categories.personalization
}
