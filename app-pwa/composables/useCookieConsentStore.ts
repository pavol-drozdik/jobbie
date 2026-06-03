import { applyAnalyticsConsent } from '~/utils/analytics-consent'
import {
  closeCookiePreferences,
  cookiePreferencesOpen,
  openCookiePreferences,
} from '~/utils/cookie-consent-ui'
import {
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  type CookieConsentPayload,
} from '~/utils/cookie-consent-state'

export function useCookieConsentStore() {
  const consentCookie = useCookie<CookieConsentPayload | null>(CONSENT_COOKIE_NAME, {
    maxAge: CONSENT_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    default: () => null,
  })

  const hasChoice = computed(() => consentCookie.value?.v === 1)
  const analyticsEnabled = computed(() => consentCookie.value?.analytics === true)
  const showBanner = computed(() => import.meta.client && !hasChoice.value)

  function persist(analytics: boolean): void {
    consentCookie.value = {
      v: 1,
      analytics,
      ts: new Date().toISOString(),
    }
    applyAnalyticsConsent(analytics)
  }

  function acceptAll(): void {
    persist(true)
    closeCookiePreferences()
  }

  function rejectAll(): void {
    persist(false)
    closeCookiePreferences()
  }

  function savePreferences(opts: { analytics: boolean }): void {
    persist(opts.analytics)
    closeCookiePreferences()
  }

  return {
    preferencesOpen: cookiePreferencesOpen,
    hasChoice,
    analyticsEnabled,
    showBanner,
    acceptAll,
    rejectAll,
    savePreferences,
    openPreferences: openCookiePreferences,
    closePreferences: closeCookiePreferences,
  }
}
