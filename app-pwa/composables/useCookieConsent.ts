import { openCookiePreferences } from '~/utils/cookie-consent-ui'

/** Open cookie preferences from any component (footer, settings, etc.). */
export function useCookieConsent() {
  return {
    showPreferences: openCookiePreferences,
  }
}
