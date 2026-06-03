import { ref } from 'vue'

/** Client-only modal flag (SPA — shared module ref, not useState). */
export const cookiePreferencesOpen = ref(false)

export function openCookiePreferences(): void {
  cookiePreferencesOpen.value = true
}

export function closeCookiePreferences(): void {
  cookiePreferencesOpen.value = false
}
