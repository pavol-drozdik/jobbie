import { isAuthCallbackRoute, hashHasSensitiveAuthHandoff } from '~/utils/auth-recovery'
import {
  mapSupabaseAuthCallbackError,
  readSupabaseAuthErrorFromUrl,
  stripSupabaseAuthErrorFromUrl,
} from '~/utils/map-supabase-auth-callback-error'
import { readOAuthSignupPending } from '~/utils/oauth-signup-pending'

/**
 * Catches Supabase OAuth errors on any route (e.g. homepage) and redirects to login/register.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }

  const router = useRouter()

  async function handleAuthUrlErrors(): Promise<void> {
    if (isAuthCallbackRoute()) {
      return
    }
    if (hashHasSensitiveAuthHandoff(window.location.hash)) {
      return
    }

    const authError = readSupabaseAuthErrorFromUrl()
    if (!authError) {
      return
    }

    const { message, destination } = mapSupabaseAuthCallbackError(
      authError.error,
      authError.errorCode,
      authError.errorDescription,
      undefined,
      { oauthSignupPending: Boolean(readOAuthSignupPending()) },
    )
    stripSupabaseAuthErrorFromUrl()

    const path = destination === 'register' ? '/auth/register' : '/auth/login'
    const reason = destination === 'register' ? 'auth_signup_failed' : 'auth_callback_failed'

    const current = router.currentRoute.value
    if (current.path === path && current.query.reason === reason && current.query.error === message) {
      return
    }

    await navigateTo(
      {
        path,
        query: { reason, error: message },
      },
      { replace: true },
    )
  }

  nuxtApp.hook('app:mounted', () => {
    void handleAuthUrlErrors()
  })

  router.afterEach(() => {
    void handleAuthUrlErrors()
  })
})
