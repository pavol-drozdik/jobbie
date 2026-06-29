import type { RegistrationCredentials, RegistrationPreferences } from '~/composables/useRegistration'
import { validateIndividualRegistrationBirthDate } from '~/utils/age-eligibility'
import { isApiUnreachableStatus } from '~/utils/api-fetch'
import { S } from '~/utils/strings'

type CaptchaVerifyData = { ok?: boolean; skipped?: boolean }

/** Returns a user-facing error when captcha verify failed; null when signup may proceed. */
export function registrationCaptchaVerifyFailed(
  status: number,
  data?: CaptchaVerifyData,
): string | null {
  if (isApiUnreachableStatus(status)) {
    return S.resetPasswordNetworkError
  }
  if (!data?.skipped && data?.ok !== true) {
    return 'Overenie captcha zlyhalo.'
  }
  return null
}

/** Supabase may return success with empty identities when the email is already registered. */
export function isSignUpDuplicateEmail(input: {
  errorMessage?: string
  identitiesCount?: number
}): boolean {
  if (input.identitiesCount === 0) {
    return true
  }
  const raw = input.errorMessage?.trim() ?? ''
  if (!raw) {
    return false
  }
  return /already.*registered|user.*already|email.*already|duplicate|already exists|already in use/i.test(
    raw,
  )
}

export function mapSignUpError(message: string | undefined): string {
  const raw = message?.trim() ?? ''
  if (isSignUpDuplicateEmail({ errorMessage: raw })) {
    return S.authSignupEmailTaken
  }
  if (/individual_registration_minimum_age/i.test(raw)) {
    return 'Registrácia je dostupná len pre osoby staršie ako 16 rokov.'
  }
  if (/individual_registration_(requires|invalid)_birth_date/i.test(raw)) {
    return 'Vyberte platný dátum narodenia.'
  }
  return raw || 'Registrácia zlyhala.'
}

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
    if (siteKey && !captchaToken?.trim()) {
      const msg = 'Bezpečnostná kontrola sa nepodarila. Obnovte stránku a skúste znova.'
      error.value = msg
      saving.value = false
      return { ok: false, error: msg }
    }
    try {
      if (effectiveCredentials.accountType === 'individual') {
        const birthDateError = validateIndividualRegistrationBirthDate(
          effectiveCredentials.birthDate ?? '',
        )
        if (birthDateError) {
          error.value = birthDateError
          return { ok: false, error: birthDateError }
        }
      }
      const meta = getMetaForSignUp(prefsOverride ?? undefined, effectiveCredentials, effectiveRoles ?? undefined)
      const trimmedCaptcha = captchaToken?.trim()
      const signUpOptions: { data: typeof meta; captchaToken?: string } = { data: meta }
      if (trimmedCaptcha) {
        signUpOptions.captchaToken = trimmedCaptcha
      }
      const emailStatusRes = await api<{ available?: boolean }>(
        '/api/auth/security/signup-email-status',
        {
          method: 'POST',
          body: {
            email: effectiveCredentials.email,
          },
          skipSessionExpiry: true,
        },
      )
      if (emailStatusRes.status === 200 && emailStatusRes.data?.available === false) {
        const msg = S.authSignupEmailTaken
        error.value = msg
        return { ok: false, error: msg }
      }
      const { data: signUpData, error: e } = await supabase.auth.signUp({
        email: effectiveCredentials.email,
        password: effectiveCredentials.password,
        options: signUpOptions,
      })
      if (e) {
        const msg = mapSignUpError(e.message)
        error.value = msg
        return { ok: false, error: msg }
      }
      if (
        isSignUpDuplicateEmail({
          identitiesCount: signUpData.user?.identities?.length,
        })
      ) {
        const msg = S.authSignupEmailTaken
        error.value = msg
        return { ok: false, error: msg }
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
