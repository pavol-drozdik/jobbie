import type { SupabaseClient } from '@supabase/supabase-js'
import { resolvePublicApiBase } from '~/utils/api-base-url'
import { hasActiveBffSession, shouldPreferBffCookieAuth } from '~/utils/bff-csrf-state'

export type BillingBffTokens = {
  accessToken: string
  refreshToken: string | null
}

/**
 * Tokens for billing step-up. After production `syncSession`, Supabase storage may be
 * cleared while HttpOnly BFF cookies remain — use `POST /api/auth/session/refresh`.
 */
export async function resolveBillingBffTokens(
  supabase: SupabaseClient,
  configuredApiBase: string,
): Promise<BillingBffTokens | null> {
  const { data } = await supabase.auth.getSession()
  let accessToken = data.session?.access_token?.trim() ?? ''
  let refreshToken = data.session?.refresh_token?.trim() ?? ''
  if (accessToken && refreshToken) {
    return { accessToken, refreshToken }
  }
  const apiBase = resolvePublicApiBase(configuredApiBase)
  const canUseBff =
    import.meta.client &&
    (hasActiveBffSession() || shouldPreferBffCookieAuth())
  if (canUseBff) {
    const { refreshBffSessionSingleFlight } = await import('~/utils/bff-refresh-single-flight')
    const refreshed = await refreshBffSessionSingleFlight(apiBase)
    const fromBff = refreshed.body.access_token?.trim()
    if (refreshed.ok && fromBff) {
      return {
        accessToken: fromBff,
        refreshToken: refreshed.body.refresh_token?.trim() ?? null,
      }
    }
  }
  if (accessToken) {
    return { accessToken, refreshToken: refreshToken || null }
  }
  return null
}
