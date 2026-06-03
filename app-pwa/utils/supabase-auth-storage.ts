/**
 * Controls where Supabase persists the PKCE + session payload:
 * - remember me ON → localStorage (survives browser close)
 * - remember me OFF → sessionStorage (cleared when the browsing session ends)
 *
 * Preference is stored in localStorage so we know where to read on cold start.
 */
export const AUTH_REMEMBER_ME_STORAGE_KEY = 'jobbie-auth-remember-me'

export function setAuthRememberMePreference(wantsPersistent: boolean): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(
    AUTH_REMEMBER_ME_STORAGE_KEY,
    wantsPersistent ? 'true' : 'false',
  )
}

/** `null` = user has never chosen (legacy installs: treat like persistent for reads/writes). */
export function readAuthRememberMePreference(): boolean | null {
  if (typeof window === 'undefined') {
    return null
  }
  const v = window.localStorage.getItem(AUTH_REMEMBER_ME_STORAGE_KEY)
  if (v === 'true') {
    return true
  }
  if (v === 'false') {
    return false
  }
  return null
}

/**
 * Supabase `auth.storage` adapter — must stay synchronous for the JS client.
 */
/** Removes persisted Supabase auth payload; in-memory session remains until signOut. */
export function clearPersistedSupabaseAuth(): void {
  if (typeof window === 'undefined') return
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && (k.includes('supabase') || k.includes('auth-token'))) {
        keys.push(k)
      }
    }
    keys.forEach((k) => storage.removeItem(k))
  }
}

export function createJobbieSupabaseAuthStorage(): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} {
  return {
    getItem(key: string): string | null {
      if (typeof window === 'undefined') {
        return null
      }
      const pref = readAuthRememberMePreference()
      if (pref === false) {
        return window.sessionStorage.getItem(key)
      }
      const fromLocal = window.localStorage.getItem(key)
      if (fromLocal !== null) {
        return fromLocal
      }
      if (pref === null) {
        return window.sessionStorage.getItem(key)
      }
      return null
    },
    setItem(key: string, value: string): void {
      if (typeof window === 'undefined') {
        return
      }
      const pref = readAuthRememberMePreference()
      if (pref === false) {
        window.localStorage.removeItem(key)
        window.sessionStorage.setItem(key, value)
        return
      }
      window.sessionStorage.removeItem(key)
      window.localStorage.setItem(key, value)
    },
    removeItem(key: string): void {
      if (typeof window === 'undefined') {
        return
      }
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    },
  }
}
