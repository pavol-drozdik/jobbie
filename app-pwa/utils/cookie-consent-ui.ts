import { ref } from 'vue'
import type { CookieConsentSource } from '~/utils/cookie-consent-state'

/** Client-only modal flag (SPA — shared module ref, not useState). */
export const cookiePreferencesOpen = ref(false)
export const cookieConsentSource = ref<CookieConsentSource>('preferences')

export function openCookiePreferences(source: CookieConsentSource = 'footer'): void {
  cookieConsentSource.value = source
  cookiePreferencesOpen.value = true
}

export function closeCookiePreferences(): void {
  cookiePreferencesOpen.value = false
}
