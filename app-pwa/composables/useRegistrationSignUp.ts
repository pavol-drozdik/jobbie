import type { RegistrationCredentials, RegistrationPreferences } from '~/composables/useRegistration'

export type SignUpResult =
  | { ok: true; needsEmailConfirmation: false }
  | { ok: true; needsEmailConfirmation: true }
  | { ok: false; error: string }

export function useRegistrationSignUp() {
  const { credentials, roles, getMetaForSignUp, clear } = useRegistration()
  const { syncSession, canUsePasskeys, enrollPasskey } = useAuth()
  const supabase = useSupabase()
  const { api } = useApi()
  const saving = ref(false)
  const error = ref<string | null>(null)

  // Branches: email confirmation (no session) vs syncSession + PATCH profile + optional passkey enroll.
  async function doSignUp(
    prefsOverride: RegistrationPreferences | null,
    captchaToken?: string | null,
    subscribeNewsletter = false,
  ): Promise<SignUpResult> {
    const effectiveCredentials = credentials.value
    const effectiveRoles = roles.value
    if (!effectiveCredentials) {
      const msg = 'Chýbajú údaje. Začnite registráciu znova.'
      error.value = msg
      return { ok: false, error: msg }
    }
    saving.value = true
    error.value = null
    const config = useRuntimeConfig().public
    const siteKey = (config.turnstileSiteKey as string) || ''
    if (siteKey) {
      if (!captchaToken?.trim()) {
        const msg = 'Potvrďte, že nie ste robot (Turnstile).'
        error.value = msg
        saving.value = false
        return { ok: false, error: msg }
      }
      const verify = await fetch(`${config.apiBaseUrl}/api/auth/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      })
      const vr = (await verify.json()) as { ok?: boolean; skipped?: boolean }
      if (!vr.skipped && vr.ok !== true) {
        const msg = 'Overenie captcha zlyhalo.'
        error.value = msg
        saving.value = false
        return { ok: false, error: msg }
      }
    }
    try {
      const meta = getMetaForSignUp(prefsOverride ?? undefined, effectiveCredentials, effectiveRoles ?? undefined)
      const { error: e } = await supabase.auth.signUp({
        email: effectiveCredentials.email,
        password: effectiveCredentials.password,
        options: { data: meta },
      })
      if (e) {
        error.value = e.message ?? 'Registrácia zlyhala.'
        return { ok: false, error: e.message ?? 'Registrácia zlyhala.' }
      }

      let sessionData = await supabase.auth.getSession()
      let token = sessionData.data.session?.access_token
      if (!token) {
        await new Promise((r) => setTimeout(r, 800))
        sessionData = await supabase.auth.getSession()
        token = sessionData.data.session?.access_token
      }

      if (!token) {
        return { ok: true, needsEmailConfirmation: true }
      }

      await syncSession()
      const patchBody: Record<string, unknown> = {}
      if (effectiveCredentials.accountType === 'individual') {
        patchBody.display_name = `${effectiveCredentials.firstName} ${effectiveCredentials.lastName}`.trim()
        patchBody.first_name = effectiveCredentials.firstName || null
        patchBody.last_name = effectiveCredentials.lastName || null
      } else {
        patchBody.company_name = effectiveCredentials.companyName || null
        patchBody.registered_office = effectiveCredentials.registeredOffice || null
        patchBody.registration_number = effectiveCredentials.ico || null
        patchBody.tax_id = effectiveCredentials.dic || null
        patchBody.vat_id = effectiveCredentials.vatId ? effectiveCredentials.vatId : null
      }
      if (prefsOverride) {
        if (prefsOverride.job_interests != null) patchBody.job_interests = prefsOverride.job_interests
        if (prefsOverride.location != null) patchBody.location = prefsOverride.location
        if (prefsOverride.sector != null) patchBody.sector = prefsOverride.sector
      }
      if (effectiveRoles) {
        patchBody.customer_role = Boolean(effectiveRoles.customer_role)
        patchBody.worker_role = Boolean(effectiveRoles.worker_role)
        patchBody.provider_role = Boolean(effectiveRoles.provider_role)
      }
      if (subscribeNewsletter) {
        patchBody.marketing_processing_consent = true
      }
      if (Object.keys(patchBody).length > 0) {
        await api('/api/profiles/me', { method: 'PATCH', body: patchBody })
      }
      if (canUsePasskeys()) {
        await enrollPasskey()
      }
      clear()
      await navigateTo('/auth/register/welcome', { replace: true })
      return { ok: true, needsEmailConfirmation: false }
    } catch {
      const msg = 'Pri registrácii sa vyskytla chyba.'
      error.value = msg
      return { ok: false, error: msg }
    } finally {
      saving.value = false
    }
  }

  return { doSignUp, saving, error }
}
