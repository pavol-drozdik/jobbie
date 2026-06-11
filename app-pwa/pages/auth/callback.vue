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

import { mapSupabaseRecoveryVerifyError } from '~/utils/map-supabase-reset-error'

import { resolveSafeInternalPath } from '~/utils/safe-navigation'



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



async function redirectToLoginWithError(message: string, redirectPath: string): Promise<void> {

  setAuthLoginBootstrap(false)

  await navigateTo(

    {

      path: '/auth/login',

      query: {

        reason: 'auth_callback_failed',

        error: message,

        redirect: redirectPath,

      },

    },

    { replace: true },

  )

}



function stripOAuthCallbackParamsFromUrl(): void {

  if (!import.meta.client || typeof window === 'undefined') return

  const url = new URL(window.location.href)

  const keys = ['code', 'state', 'error', 'error_description', 'error_code']

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

    const description = readQueryString('error_description')

    await redirectToLoginWithError(description ?? 'OAuth zlyhal.', target)

    return

  }



  try {

    const handoff = readRecoveryHandoffFromRoute(route)

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

        await redirectToLoginWithError(message, target)

        return

      }

      stripRecoveryParamsFromUrl()

    } else {

      const codeStr = readQueryString('code')

      if (codeStr) {

        const { error } = await supabase.auth.exchangeCodeForSession(codeStr)

        if (error) {

          if (import.meta.dev) {

            console.warn('[auth/callback] exchangeCodeForSession failed', error)

          }

          await redirectToLoginWithError(

            error.message?.trim() || S.loginPostAuthFailed,

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

      await redirectToLoginWithError(S.loginPostAuthFailed, target)

      return

    }



    const flow = await finishAuthAfterSignIn(supaSession, target)

    if (flow.outcome === 'mfa') {

      return

    }

    if (flow.outcome !== 'success') {

      await redirectToLoginWithError(flow.error ?? S.loginPostAuthFailed, target)

    }

  } catch (err) {

    console.error('[auth/callback] handoff failed', err)

    await redirectToLoginWithError(S.loginPostAuthFailed, target)

  }

})

</script>

