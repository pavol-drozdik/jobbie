import { setAuthRememberMePreference } from '~/utils/supabase-auth-storage'

export type PasskeyConditionalSignInOptions = {
  redirectPath: string
  getRememberMe?: () => boolean
  onError?: (message: string) => void
  onSigningIn?: () => void
}

/**
 * Passkey sign-in via WebAuthn Conditional UI (email autofill). No button or modal prompt.
 * Call `start` on the login form mount; `abort` before password/OAuth submit or unmount.
 */
export function usePasskeyConditionalSignIn() {
  const { canUsePasskeys, signInWithPasskeyConditional } = useAuth()
  const { finishAuthAfterSignIn } = usePasskeySignInFlow()

  let activeAbort: AbortController | null = null
  let running = false

  function abortConditionalPasskeySignIn(): void {
    activeAbort?.abort()
    activeAbort = null
  }

  async function startConditionalPasskeySignIn(
    options: PasskeyConditionalSignInOptions,
  ): Promise<void> {
    if (!import.meta.client || !canUsePasskeys() || running) return

    const controller = new AbortController()
    activeAbort = controller
    running = true

    try {
      const result = await signInWithPasskeyConditional(controller.signal)
      if (controller.signal.aborted || result.cancelled) return
      if (!result.ok || !result.session) {
        if (result.error) options.onError?.(result.error)
        return
      }
      options.onSigningIn?.()
      if (options.getRememberMe) {
        setAuthRememberMePreference(options.getRememberMe())
      }
      const flow = await finishAuthAfterSignIn(result.session, options.redirectPath)
      if (flow.error) options.onError?.(flow.error)
    } finally {
      running = false
      if (activeAbort === controller) activeAbort = null
    }
  }

  return {
    startConditionalPasskeySignIn,
    abortConditionalPasskeySignIn,
  }
}
