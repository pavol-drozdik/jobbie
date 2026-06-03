import { setApiBearerToken } from '~/utils/api-bearer-token'

export type BffSessionRefreshBody = {
  ok?: boolean
  access_token?: string
  refresh_token?: string
  csrf_token?: string
}
/**
 * Apply Nest `POST /api/auth/session/refresh` JSON to client auth state.
 * Default: cookie session only — no Supabase setSession (avoids localStorage token persistence).
 */
export async function applyBffSessionRefreshBody(
  body: BffSessionRefreshBody,
  options?: { syncSupabase?: boolean },
): Promise<boolean> {
  if (body.csrf_token?.trim()) {
    const { persistBffSessionClientState } = await import('~/utils/bff-csrf-state')
    persistBffSessionClientState(body.csrf_token)
  } else if (body.ok) {
    const { useBffSessionActive } = await import('~/utils/bff-csrf-state')
    useBffSessionActive().value = true
    const { writeBffSessionHint } = await import('~/utils/bff-session-hint')
    writeBffSessionHint()
  }

  if (options?.syncSupabase !== true || !import.meta.client) {
    return Boolean(body.ok)
  }

  const access = body.access_token?.trim()
  const refresh = body.refresh_token?.trim()
  if (!access || !refresh) return Boolean(body.ok)

  const supabase = useSupabase()
  const { data, error } = await supabase.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  })
  if (error || !data.session) return false
  const { setApiBearerToken } = await import('~/utils/api-bearer-token')
  setApiBearerToken(data.session.access_token)
  const { session: authSession } = useAuth()
  authSession.value = { access_token: data.session.access_token }
  return true
}

/** In-memory bearer for bootstrap after cookie refresh (no Supabase persistence). */
export function applyBffRefreshAccessToAuthState(
  body: BffSessionRefreshBody,
): string | null {
  const access = body.access_token?.trim()
  if (!access) return null
  setApiBearerToken(access)
  const { session } = useAuth()
  session.value = { access_token: access }
  return access
}

export async function refreshBffSessionFromApi(
  apiBase: string,
): Promise<{ ok: boolean; body: BffSessionRefreshBody }> {
  const { fetchApi } = await import('~/utils/api-fetch')
  const res = await fetchApi(`${apiBase}/api/auth/session/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  const text = await res.text()
  let body: BffSessionRefreshBody = {}
  try {
    if (text) body = JSON.parse(text) as BffSessionRefreshBody
  } catch {
    /* ignore */
  }
  if (!res.ok) return { ok: false, body }
  const applied = await applyBffSessionRefreshBody(body)
  return { ok: applied, body }
}
