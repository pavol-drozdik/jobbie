import type { RegistrationCredentials, RegistrationPreferences } from '~/composables/useRegistration'
import { markPendingRegistrationPromo } from '~/composables/useRegistrationPromo'
import { trackRegistrationComplete } from '~/utils/gtm-client'
import { validateIndividualRegistrationBirthDate } from '~/utils/age-eligibility'
import { isApiUnreachableStatus } from '~/utils/api-fetch'
import { ROUTES } from '~/utils/app-routes'
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
  if (/user is banned/i.test(raw) || raw === 'user_banned') {
    return S.authAccountClosed
  }
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
  const { syncSession } = useAuth()
  const supabase = useSupabase()
  const { api } = useApi()
  const saving = ref(false)
  const error = ref<string | null>(null)

  // Branches: email confirmation (no session) vs syncSession + PATCH profile → home.
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
        markPendingRegistrationPromo(effectiveCredentials.promoCode)
        trackRegistrationComplete({
          accountType: effectiveCredentials.accountType,
          emailConfirmationPending: true,
        })
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
        const patchRes = await api('/api/profiles/me', { method: 'PATCH', body: patchBody })
        if (!patchRes.ok) {
          if (import.meta.dev) {
            console.warn('[registration] PATCH /api/profiles/me failed', {
              status: patchRes.status,
              body: patchRes.body?.slice(0, 200),
            })
          }
        }
      }
      const { redeemRegistrationPromoIfSignupEligible } = useRegistrationPromo()
      const promoResult = await redeemRegistrationPromoIfSignupEligible(
        effectiveCredentials.promoCode ?? undefined,
      )
      trackRegistrationComplete({
        accountType: effectiveCredentials.accountType,
        emailConfirmationPending: false,
      })
      clear()
      const homeQuery: Record<string, string> = {}
      if (promoResult?.ok && promoResult.credits_granted != null) {
        homeQuery.promo_credits = String(promoResult.credits_granted)
      }
      await navigateTo(
        homeQuery.promo_credits ? { path: ROUTES.home, query: homeQuery } : ROUTES.home,
        { replace: true },
      )
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
