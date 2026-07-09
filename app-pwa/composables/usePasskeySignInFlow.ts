import type { Session } from '@supabase/supabase-js'
import { setAuthLoginBootstrap } from '~/utils/auth-recovery'
import { isApiUnreachableStatus } from '~/utils/api-fetch'
import { ROUTES } from '~/utils/app-routes'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import { setAuthRememberMePreference } from '~/utils/supabase-auth-storage'
import { S } from '~/utils/strings'

export type PasskeySignInFlowOutcome =
  | 'success'
  | 'mfa'
  | 'cancelled'
  | 'unavailable'
  | 'failed'

export type PasskeySignInFlowResult = {
  outcome: PasskeySignInFlowOutcome
  error?: string
}

export type PasskeySignInFlowOptions = {
  /** Post-login path when MFA is not required (defaults to home). */
  redirectPath?: string
  captchaToken?: string
  rememberMe?: boolean
}

/**
 * Discoverable passkey sign-in + Nest BFF bootstrap. Used from navbar and login form.
 */
export function usePasskeySignInFlow() {
  const supabase = useSupabase()
  const { syncSession, user, canUsePasskeys, signInWithPasskey } = useAuth()

  function resolveRedirectPath(redirectPath?: string): string {
    return resolveSafeInternalPath(redirectPath, ROUTES.home)
  }

  async function finishAuthAfterSignIn(
    signInSession: Session,
    redirectPath: string,
  ): Promise<PasskeySignInFlowResult> {
    setAuthLoginBootstrap(true)
    const target = resolveRedirectPath(redirectPath)
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (
      aalData?.nextLevel === 'aal2' &&
      aalData.currentLevel !== 'aal2'
    ) {
      await navigateTo({
        path: '/auth/mfa',
        query: { redirect: target },
      })
      return { outcome: 'mfa' }
    }
    if (!signInSession.access_token || !signInSession.refresh_token) {
      setAuthLoginBootstrap(false)
      return { outcome: 'failed', error: S.loginPostAuthFailed }
    }
    const loaded = await syncSession({
      loginBootstrap: true,
      supabaseSession: signInSession,
    })
    await nextTick()
    if (!loaded || !user.value) {
      const { api, getApiBaseUrl } = useApi()
      const probe = await api('/api/auth/me', {
        token: signInSession.access_token,
        skipSessionExpiry: true,
      })
      const error = isApiUnreachableStatus(probe.status)
        ? S.loginApiUnreachable
        : S.loginPostAuthFailed
      if (import.meta.dev) {
        console.warn('[passkey-sign-in] post-auth bootstrap failed', {
          loaded,
          hasUser: Boolean(user.value),
          authMeStatus: probe.status,
          apiBase: getApiBaseUrl(),
        })
      }
      setAuthLoginBootstrap(false)
      return { outcome: 'failed', error }
    }
    const { tryRedeemPendingRegistrationPromo } = useRegistrationPromo()
    const promoResult = await tryRedeemPendingRegistrationPromo()
    let targetWithPromo = target
    if (promoResult?.ok && promoResult.credits_granted != null) {
      const sep = target.includes('?') ? '&' : '?'
      targetWithPromo = `${target}${sep}promo_credits=${promoResult.credits_granted}`
    }
    const nav = await navigateTo(targetWithPromo, { replace: true })
    if (nav === false && import.meta.client) {
      window.location.assign(target)
    }
    // Supabase may fire a deferred onAuthStateChange ~1s after SIGNED_IN — keep handoff guard briefly.
    if (import.meta.client) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1500)
      })
    }
    setAuthLoginBootstrap(false)
    return { outcome: 'success' }
  }

  async function attemptPasskeySignIn(
    options?: PasskeySignInFlowOptions,
  ): Promise<PasskeySignInFlowResult> {
    if (!import.meta.client || !canUsePasskeys()) {
      return { outcome: 'unavailable' }
    }
    setAuthLoginBootstrap(true)
    try {
      const result = await signInWithPasskey(options?.captchaToken?.trim() || undefined)
      if (result.ok && result.session) {
        if (options?.rememberMe !== undefined) {
          setAuthRememberMePreference(options.rememberMe)
        }
        return finishAuthAfterSignIn(
          result.session,
          options?.redirectPath ?? ROUTES.home,
        )
      }
      setAuthLoginBootstrap(false)
      if (result.cancelled) {
        return { outcome: 'cancelled' }
      }
      if (result.error) {
        return { outcome: 'failed', error: result.error }
      }
      return { outcome: 'cancelled' }
    } catch (err) {
      console.error('[passkey-sign-in] unexpected error', err)
      setAuthLoginBootstrap(false)
      return { outcome: 'failed', error: S.loginPostAuthFailed }
    }
  }

  return {
    attemptPasskeySignIn,
    finishAuthAfterSignIn,
    resolveRedirectPath,
  }
}
