import { applyAnalyticsConsent, initGtagConsentDefault } from '~/utils/analytics-consent'
import {
  categoriesFromPayload,
  ensureConsentVisitorId,
  hasValidConsentChoice,
  setAnalyticsConsentGranted,
  useConsentCookieRef,
} from '~/utils/cookie-consent-state'
import { openCookiePreferences } from '~/utils/cookie-consent-ui'

/**
 * Cookie consent boot: gtag Consent Mode default-denied, replay stored jb_consent.
 * GTM (GA4/Clarity) loads only after analytics consent — see applyAnalyticsConsent.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }
  initGtagConsentDefault()
  nuxtApp.provide('openCookiePreferences', openCookiePreferences)

  ensureConsentVisitorId()
  const consentCookie = useConsentCookieRef()

  if (hasValidConsentChoice(consentCookie.value)) {
    const categories = categoriesFromPayload(consentCookie.value)
    applyAnalyticsConsent(categories.analytics)
    return
  }

  setAnalyticsConsentGranted(false)
})
