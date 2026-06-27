export type BillingStepUpGate =
  | { ok: true }
  | { ok: false; message: string }

/** Pre-flight before billing UI: browser session, BFF bootstrap, MFA when required. */
export function useBillingStepUp() {
  const supabase = useSupabase()
  const route = useRoute()
  const { user, session } = useAuth()
  const { ensureBffSessionFromSupabase } = useBffSession()

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

  return {
    ensureRecentLoginForBilling,
  }
}
