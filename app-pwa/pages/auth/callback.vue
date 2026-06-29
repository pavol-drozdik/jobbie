<template>
  <div class="app-shell flex min-h-screen items-center justify-center p-4">
    <p class="text-sm" style="color: var(--ink3)">{{ S.loading }}</p>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import {
  AUTH_RESET_PASSWORD_PATH,
  readRecoveryHandoffFromRoute,
  setAuthLoginBootstrap,
  stripRecoveryParamsFromUrl,
} from '~/utils/auth-recovery'
import {
  mapSupabaseAuthCallbackError,
  stripSupabaseAuthErrorFromUrl,
} from '~/utils/map-supabase-auth-callback-error'
import { mapSupabaseRecoveryVerifyError } from '~/utils/map-supabase-reset-error'
import { establishOAuthCallbackSession } from '~/utils/oauth-callback-session'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import {
  buildProfilePatchFromSignupMeta,
  clearOAuthSignupPending,
  readOAuthSignupPending,
} from '~/utils/oauth-signup-pending'

const AUTH_CALLBACK_OTP_TYPES = new Set([
  'signup',
  'invite',
  'magiclink',
  'email_change',
])

definePageMeta({ layout: 'app' })

const supabase = useSupabase()
const route = useRoute()
const { finishAuthAfterSignIn } = usePasskeySignInFlow()
const { api } = useApi()
const { clear: clearRegistrationState } = useRegistration()

function resolveRedirectPath(): string {
  const raw = route.query.redirect
  const s = Array.isArray(raw) ? raw[0] : raw
  const path = resolveSafeInternalPath(s, ROUTES.home)
  if (path === AUTH_RESET_PASSWORD_PATH || path.startsWith(`${AUTH_RESET_PASSWORD_PATH}?`)) {
    return AUTH_RESET_PASSWORD_PATH
  }
  return path
}

function readQueryString(key: string): string | undefined {
  const raw = route.query[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

async function redirectWithAuthError(
  error?: string,
  errorCode?: string,
  errorDescription?: string,
  message?: string,
  redirectPath?: string,
): Promise<void> {
  const oauthSignupPending = Boolean(readOAuthSignupPending())
  setAuthLoginBootstrap(false)
  clearOAuthSignupPending()
  const mapped = mapSupabaseAuthCallbackError(
    error,
    errorCode,
    errorDescription,
    message,
    { oauthSignupPending },
  )
  const path = mapped.destination === 'register' ? '/auth/register' : '/auth/login'
  const reason = mapped.destination === 'register' ? 'auth_signup_failed' : 'auth_callback_failed'
  const query: Record<string, string> = {
    reason,
    error: mapped.message,
  }
  if (redirectPath && mapped.destination === 'login') {
    query.redirect = redirectPath
  }
  await navigateTo({ path, query }, { replace: true })
}

async function applyPendingOAuthSignupProfile(accessToken?: string): Promise<string | null> {
  const pending = readOAuthSignupPending()
  if (!pending) return null

  const role = pending.meta.role === 'company' ? 'company' : 'individual'
  if (role === 'individual' && !pending.meta.birth_date?.trim()) {
    return S.authSignupDatabaseFailed
  }

  if (Object.keys(pending.meta).length > 0) {
    const { error } = await supabase.auth.updateUser({ data: pending.meta })
    if (error) {
      return error.message?.trim() || S.authSignupDatabaseFailed
    }
  }

  const patchBody = buildProfilePatchFromSignupMeta(pending.meta)
  if (pending.newsletterSubscribe) {
    patchBody.marketing_processing_consent = true
  }
  if (Object.keys(patchBody).length > 0) {
    const patchRes = await api('/api/profiles/me', {
      method: 'PATCH',
      body: patchBody,
      ...(accessToken ? { token: accessToken } : {}),
    })
    if (!patchRes.ok && import.meta.dev) {
      console.warn('[auth/callback] OAuth registration PATCH /api/profiles/me failed', {
        status: patchRes.status,
        body: patchRes.body?.slice(0, 200),
      })
    }
  }

  clearOAuthSignupPending()
  clearRegistrationState()
  return null
}

function stripOAuthCallbackParamsFromUrl(): void {
  stripSupabaseAuthErrorFromUrl()
  if (!import.meta.client || typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const keys = ['code', 'state']
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (!changed) return
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}

onMounted(async () => {
  const target = resolveRedirectPath()
  setAuthLoginBootstrap(true)

  const oauthError = readQueryString('error')
  if (oauthError) {
    await redirectWithAuthError(
      oauthError,
      readQueryString('error_code'),
      readQueryString('error_description'),
      undefined,
      target,
    )
    return
  }

  try {
    const handoff = readRecoveryHandoffFromRoute(route)
    const isEmailChangeHandoff = handoff.type === 'email_change'
    if (
      handoff.tokenHash &&
      handoff.type &&
      AUTH_CALLBACK_OTP_TYPES.has(handoff.type)
    ) {
      const { error } = await supabase.auth.verifyOtp({
        type: handoff.type as 'signup' | 'invite' | 'magiclink' | 'email_change',
        token_hash: handoff.tokenHash,
      })
      if (error) {
        const message = mapSupabaseRecoveryVerifyError(error.code, error.message)
        await redirectWithAuthError(undefined, error.code, undefined, message, target)
        return
      }
      stripRecoveryParamsFromUrl()
    } else {
      const codeStr = readQueryString('code')
      if (codeStr) {
        const exchanged = await establishOAuthCallbackSession(supabase, codeStr)
        if (!exchanged.ok) {
          if (import.meta.dev) {
            console.warn('[auth/callback] OAuth session handoff failed', exchanged)
          }
          await redirectWithAuthError(
            undefined,
            exchanged.code,
            undefined,
            exchanged.message || S.loginPostAuthFailed,
            target,
          )
          return
        }
      }
      stripOAuthCallbackParamsFromUrl()
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const supaSession = sessionData.session
    if (!supaSession?.access_token || !supaSession.refresh_token) {
      await redirectWithAuthError(undefined, undefined, undefined, S.loginPostAuthFailed, target)
      return
    }

    const postAuthTarget = isEmailChangeHandoff
      ? '/nastavenia/bezpecnost?email_changed=1'
      : target
    const signupApplyError = await applyPendingOAuthSignupProfile(supaSession.access_token)
    if (signupApplyError) {
      await redirectWithAuthError(undefined, undefined, undefined, signupApplyError, target)
      return
    }
    const flow = await finishAuthAfterSignIn(supaSession, postAuthTarget)
    if (flow.outcome === 'mfa') {
      return
    }
    if (flow.outcome !== 'success') {
      await redirectWithAuthError(undefined, undefined, undefined, flow.error ?? S.loginPostAuthFailed, target)
    }
  } catch (err) {
    console.error('[auth/callback] handoff failed', err)
    await redirectWithAuthError(undefined, undefined, undefined, S.loginPostAuthFailed, target)
  }
})
</script>
