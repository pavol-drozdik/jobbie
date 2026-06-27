import { applyAnalyticsConsent, initGtagConsentDefault } from '~/utils/analytics-consent'
import {
  categoriesFromPayload,
  ensureConsentVisitorId,
  hasValidConsentChoice,
  setAnalyticsConsentGranted,
  useConsentCookieRef,
} from '~/utils/cookie-consent-state'
import { loadGtm, isGtmConfigured } from '~/utils/gtm-client'
import { openCookiePreferences } from '~/utils/cookie-consent-ui'

/**
 * Cookie consent boot: gtag Consent Mode default-denied, GTM bootstrap, replay stored jb_consent.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }
  initGtagConsentDefault()
  nuxtApp.provide('openCookiePreferences', openCookiePreferences)

  ensureConsentVisitorId()
  const consentCookie = useConsentCookieRef()

  if (isGtmConfigured()) {
    loadGtm()
  }

  if (hasValidConsentChoice(consentCookie.value)) {
    const categories = categoriesFromPayload(consentCookie.value)
    applyAnalyticsConsent(categories.analytics)
    return
  }

  setAnalyticsConsentGranted(false)
})
