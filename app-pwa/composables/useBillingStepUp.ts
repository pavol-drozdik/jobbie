import {
  isStepUpRequiredResponse,
  parseApiErrorMessage,
  type ApiResultLike,
} from '~/utils/api-errors'
import { resolveBillingBffTokens } from '~/utils/billing-bff-auth'
import { resolvePublicApiBase } from '~/utils/api-base-url'
import { ensureBffCsrfForMutation, shouldPreferBffCookieAuth } from '~/utils/bff-csrf-state'
import { S } from '~/utils/strings'

export type BillingStepUpGate =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Billing mutations require api_user_sessions.last_step_up_at within 15 minutes.
 * Does not call step-up on every click — BFF login sets the timestamp; retry step-up
 * only when the API returns step_up_required.
 */
export function useBillingStepUp() {
  const supabase = useSupabase()
  const route = useRoute()
  const { user, session } = useAuth()
  const { stepUp, establishSession, ensureBffSessionFromSupabase, logoutSession } =
    useBffSession()

  async function ensureRecentLoginForBilling(): Promise<BillingStepUpGate> {
    if (!import.meta.client) {
      return { ok: false, message: 'Platbu je možné dokončiť len v prehliadači.' }
    }

    const { readBffCsrfToken } = await import('~/utils/bff-csrf-state')
    const token = session.value?.access_token

    if (!user.value && !token) {
      return {
        ok: false,
        message: 'Ste odhlásený. Prihláste sa znova a skúste ešte raz.',
      }
    }

    if (!readBffCsrfToken()) {
      const booted = await ensureBffSessionFromSupabase()
      if (!booted && !token) {
        return {
          ok: false,
          message:
            'Relácia s platobným serverom nie je pripravená. Obnovte stránku alebo sa znova prihláste.',
        }
      }
    }

    if (token) {
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (
        aalData?.nextLevel === 'aal2' &&
        aalData.currentLevel !== 'aal2'
      ) {
        await navigateTo({
          path: '/auth/mfa',
          query: { redirect: route.fullPath },
        })
        return {
          ok: false,
          message: 'Pred platbou dokončite overenie dvojfaktorovým kódom.',
        }
      }
    }

    return { ok: true }
  }

  /**
   * Ensures api_user_sessions exists and last_step_up_at is fresh before billing mutations.
   * Stale in-memory jb_csrf alone must not skip BFF bootstrap (common on localhost dev).
   */
  async function ensureBillingStepUpBeforeMutation(): Promise<boolean> {
    const configuredApi = String(useRuntimeConfig().public.apiBaseUrl ?? '')
    const apiBase = resolvePublicApiBase(configuredApi)
    const tokens = await resolveBillingBffTokens(supabase, configuredApi)
    if (!tokens?.accessToken) {
      return false
    }
    const { accessToken, refreshToken } = tokens
    await ensureBffSessionFromSupabase({ force: false })
    if (shouldPreferBffCookieAuth()) {
      await ensureBffCsrfForMutation(apiBase)
    }
    try {
      await stepUp(accessToken)
      return true
    } catch {
      /* missing api_user_sessions row or expired step-up window */
    }
    try {
      if (refreshToken) {
        await logoutSession()
        await establishSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      } else {
        const booted = await ensureBffSessionFromSupabase({ force: true })
        if (!booted) {
          throw new Error('BFF session not available')
        }
      }
      if (shouldPreferBffCookieAuth()) {
        await ensureBffCsrfForMutation(apiBase)
      }
      await stepUp(accessToken)
      return true
    } catch {
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (
        aalData?.nextLevel === 'aal2' &&
        aalData.currentLevel !== 'aal2'
      ) {
        await navigateTo({
          path: '/auth/mfa',
          query: { redirect: route.fullPath },
        })
        return false
      }
      return false
    }
  }

  async function tryRecoverFromStepUpRequired(): Promise<boolean> {
    return ensureBillingStepUpBeforeMutation()
  }

  function billingStepUpFailureMessage(): string {
    return S.settingsBillingStepUpFailed
  }

  async function billingStepUpUserMessage(res: ApiResultLike): Promise<string> {
    if (isStepUpRequiredResponse(res)) {
      if (await tryRecoverFromStepUpRequired()) {
        return ''
      }
      return (
        parseApiErrorMessage(res, 'Vyžaduje sa nedávne prihlásenie.') +
        ' Prihláste sa znova alebo dokončite MFA a skúste znova.'
      )
    }
    return parseApiErrorMessage(res, 'Platba sa nepodarila.')
  }

  return {
    ensureRecentLoginForBilling,
    ensureBillingStepUpBeforeMutation,
    tryRecoverFromStepUpRequired,
    billingStepUpFailureMessage,
    billingStepUpUserMessage,
    isStepUpRequiredResponse,
  }
}
