import { resolvePublicApiBase } from '~/utils/api-base-url'
import { fetchApi } from '~/utils/api-fetch'
import { getOrCreateDeviceId } from '~/utils/device-id'
import {
  clearBffSessionClientState,
  persistBffSessionClientState,
  readBffCsrfToken,
  useBffSessionActive,
} from '~/utils/bff-csrf-state'

export type BffSessionResult = {
  ok: boolean
  csrf_token?: string
}

/**
 * Exchanges Supabase tokens for HttpOnly API session cookies.
 * Uses raw fetch (not useApi) to avoid circular auth and because this runs before jb_csrf exists.
 */
export function useBffSession() {
  const config = useRuntimeConfig().public
  const bffActive = useBffSessionActive()

  function apiBase(): string {
    return resolvePublicApiBase(String(config.apiBaseUrl ?? ''))
  }

  async function establishSession(tokens: {
    access_token: string
    refresh_token: string
  }): Promise<BffSessionResult> {
    const res = await fetchApi(`${apiBase()}/api/auth/session`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        device_id: getOrCreateDeviceId(),
        user_agent:
          import.meta.client && typeof navigator !== 'undefined'
            ? navigator.userAgent
            : undefined,
      }),
    })
    const text = await res.text()
    let data: BffSessionResult | undefined
    try {
      if (text) data = JSON.parse(text) as BffSessionResult
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      bffActive.value = false
      throw new Error('Could not establish API session')
    }
    const result = data ?? { ok: true }
    if (result.csrf_token?.trim()) {
      persistBffSessionClientState(result.csrf_token)
    } else {
      bffActive.value = true
    }
    return result
  }

  async function probeActiveBffCookies(): Promise<boolean> {
    const res = await fetchApi(`${apiBase()}/api/auth/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return false
    if (!readBffCsrfToken()) {
      const { refreshBffSessionFromApi } = await import('~/utils/bff-session-refresh')
      const refreshed = await refreshBffSessionFromApi(apiBase())
      if (!refreshed.ok || !readBffCsrfToken()) {
        return false
      }
    }
    bffActive.value = true
    return true
  }

  /** Creates/refreshes BFF cookies when Supabase session exists but jb_sid is missing (common in dev). */
  async function ensureBffSessionFromSupabase(options?: { force?: boolean }): Promise<boolean> {
    if (!import.meta.client) return false
    if (!options?.force) {
      if (readBffCsrfToken() && bffActive.value) {
        return true
      }
      if (readBffCsrfToken() && (await probeActiveBffCookies())) {
        return true
      }
    }
    const supabase = useSupabase()
    const { data } = await supabase.auth.getSession()
    const s = data.session
    if (!s?.access_token || !s.refresh_token) return false
    try {
      await establishSession({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
      })
      return true
    } catch {
      return false
    }
  }

  async function logoutSession(): Promise<void> {
    clearBffSessionClientState()
    try {
      await fetchApi(`${apiBase()}/api/auth/session/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
    } catch {
      /* best-effort */
    }
  }

  // Recent-login proof for billing, delete account, passkeys — requires fresh Supabase access token.
  async function stepUp(accessToken: string): Promise<void> {
    const csrf = readBffCsrfToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (csrf) headers['X-CSRF-Token'] = csrf
    const res = await fetchApi(`${apiBase()}/api/auth/session/step-up`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ access_token: accessToken }),
    })
    if (!res.ok) {
      throw new Error('Step-up failed')
    }
  }

  return {
    establishSession,
    logoutSession,
    stepUp,
    ensureBffSessionFromSupabase,
    apiBase,
  }
}
