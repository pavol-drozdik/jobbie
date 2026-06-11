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
    const boundRes = await fetchApi(`${apiBase()}/api/auth/session/bound`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!boundRes.ok) return false
    let sessionBound = false
    try {
      const text = await boundRes.text()
      if (text) {
        const body = JSON.parse(text) as { session_bound?: boolean }
        sessionBound = body.session_bound === true
      }
    } catch {
      return false
    }
    if (!sessionBound) return false
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
      if (readBffCsrfToken() && (await probeActiveBffCookies())) {
        bffActive.value = true
        return true
      }
    }
    const supabase = useSupabase()
    const { data } = await supabase.auth.getSession()
    const s = data.session
    if (s?.access_token && s.refresh_token) {
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
    const { refreshBffSessionFromApi } = await import('~/utils/bff-session-refresh')
    const refreshed = await refreshBffSessionFromApi(apiBase())
    return refreshed.ok
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

  // Recent-login proof for billing, delete account, passkeys — requires jb_sid + CSRF.
  async function stepUp(accessToken: string): Promise<void> {
    const postStepUp = async (): Promise<boolean> => {
      const csrf = readBffCsrfToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      if (csrf) headers['X-CSRF-Token'] = csrf
      headers.Authorization = `Bearer ${accessToken}`
      const res = await fetchApi(`${apiBase()}/api/auth/session/step-up`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ access_token: accessToken }),
      })
      return res.ok
    }
    if (await postStepUp()) return
    const { refreshBffSessionSingleFlight } = await import('~/utils/bff-refresh-single-flight')
    const refreshed = await refreshBffSessionSingleFlight(apiBase())
    if (refreshed.ok && (await postStepUp())) return
    throw new Error('Step-up failed')
  }

  return {
    establishSession,
    logoutSession,
    stepUp,
    ensureBffSessionFromSupabase,
    verifyBffSessionBound: probeActiveBffCookies,
    apiBase,
  }
}
