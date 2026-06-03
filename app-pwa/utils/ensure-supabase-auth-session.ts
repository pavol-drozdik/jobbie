import type { Session } from '@supabase/supabase-js'
import { normalizePublicApiBase } from '~/utils/api-base-url'
import { setApiBearerToken } from '~/utils/api-bearer-token'
import { refreshBffSessionFromApi } from '~/utils/bff-session-refresh'

/**
 * Supabase Auth (MFA, passkeys, updateUser) needs a user JWT in the JS client.
 * After BFF bootstrap we clear persisted Supabase storage; restore from HttpOnly cookies.
 */
export async function ensureSupabaseAuthSession(): Promise<{
  ok: boolean
  session: Session | null
  error?: string
}> {
  if (!import.meta.client) {
    return { ok: false, session: null, error: 'Not in browser' }
  }

  const supabase = useSupabase()
  const { data: existing } = await supabase.auth.getSession()
  const current = existing.session
  if (current?.access_token && current.user?.id) {
    setApiBearerToken(current.access_token)
    const { session } = useAuth()
    session.value = { access_token: current.access_token }
    return { ok: true, session: current }
  }

  const config = useRuntimeConfig().public
  const base = normalizePublicApiBase(String(config.apiBaseUrl ?? ''))
  const refreshed = await refreshBffSessionFromApi(base)
  if (!refreshed.ok) {
    return {
      ok: false,
      session: null,
      error: 'Nepodarilo sa obnoviť prihlásenie. Skúste sa odhlásiť a prihlásiť znova.',
    }
  }

  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    return {
      ok: false,
      session: null,
      error: 'Nepodarilo sa synchronizovať session.',
    }
  }

  return { ok: true, session: data.session }
}
