import { applyAnalyticsConsent, initGtagConsentDefault } from '~/utils/analytics-consent'
import {
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  type CookieConsentPayload,
  setAnalyticsConsentGranted,
} from '~/utils/cookie-consent-state'
import { openCookiePreferences } from '~/utils/cookie-consent-ui'

/**
 * Cookie consent boot: gtag Consent Mode default-denied + replay stored jb_consent.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }
  initGtagConsentDefault()
  nuxtApp.provide('openCookiePreferences', openCookiePreferences)

  const consentCookie = useCookie<CookieConsentPayload | null>(CONSENT_COOKIE_NAME, {
    maxAge: CONSENT_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    default: () => null,
  })

  if (consentCookie.value?.v === 1) {
    applyAnalyticsConsent(consentCookie.value.analytics)
    return
  }

  setAnalyticsConsentGranted(false)
})
