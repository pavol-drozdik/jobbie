import type { Session } from '@supabase/supabase-js'

import { normalizePublicApiBase } from '~/utils/api-base-url'

import { setAuthSessionAccessToken } from '~/utils/auth-session-state'

import { refreshBffSessionFromApi } from '~/utils/bff-session-refresh'



function isUsableSession(session: Session | null | undefined): session is Session {

  return Boolean(session?.access_token?.trim() && session.user?.id)

}



/**

 * Supabase Auth (MFA, passkeys, updateUser) needs a user JWT in the JS client.

 * After BFF bootstrap we may clear persisted Supabase storage; restore via refresh or cookies.

 */

export async function ensureSupabaseAuthSession(): Promise<{

  ok: boolean

  session: Session | null

  error?: string

}> {

  if (!import.meta.client) {

    return { ok: false, session: null, error: 'Not in browser' }

  }



  const { useSupabase } = await import('~/composables/useSupabase')

  const supabase = useSupabase()



  const { data: existing } = await supabase.auth.getSession()

  if (isUsableSession(existing.session)) {

    setAuthSessionAccessToken(existing.session.access_token)

    return { ok: true, session: existing.session }

  }



  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()

  if (isUsableSession(refreshed.session)) {

    setAuthSessionAccessToken(refreshed.session.access_token)

    return { ok: true, session: refreshed.session }

  }



  if (import.meta.dev && refreshError) {

    console.warn('[auth] supabase.auth.refreshSession failed', refreshError.message)

  }



  const config = useRuntimeConfig().public

  const base = normalizePublicApiBase(String(config.apiBaseUrl ?? ''))

  const refreshedBff = await refreshBffSessionFromApi(base, { syncSupabase: true })

  if (refreshedBff.ok) {

    const { data } = await supabase.auth.getSession()

    if (isUsableSession(data.session)) {

      setAuthSessionAccessToken(data.session.access_token)

      return { ok: true, session: data.session }

    }

  }



  const hasTokens =

    Boolean(refreshedBff.body.access_token?.trim()) &&

    Boolean(refreshedBff.body.refresh_token?.trim())

  return {

    ok: false,

    session: null,

    error: hasTokens

      ? 'Nepodarilo sa synchronizovať session.'

      : 'Nepodarilo sa obnoviť prihlásenie. Skúste sa odhlásiť a prihlásiť znova.',

  }

}



/** Keep Supabase JS client aligned after Nest BFF handoff (passkeys, MFA, updateUser). */

export async function applySupabaseSessionTokens(

  accessToken: string,

  refreshToken: string,

): Promise<boolean> {

  if (!import.meta.client) return false

  const access = accessToken.trim()

  const refresh = refreshToken.trim()

  if (!access || !refresh) return false



  const { useSupabase } = await import('~/composables/useSupabase')

  const supabase = useSupabase()

  const { data, error } = await supabase.auth.setSession({

    access_token: access,

    refresh_token: refresh,

  })

  if (error || !isUsableSession(data.session)) {

    if (import.meta.dev) {

      console.warn('[auth] applySupabaseSessionTokens failed', error?.message)

    }

    return false

  }

  setAuthSessionAccessToken(data.session.access_token)

  return true

}


