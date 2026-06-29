/** Turnstile captcha helpers when `NUXT_PUBLIC_TURNSTILE_SITE_KEY` is set (required by Supabase Auth when dashboard captcha is on). */
export function useAuthCaptcha() {
  const config = useRuntimeConfig().public
  const turnstileEnabled = computed(
    () => String(config.turnstileSiteKey ?? '').trim().length > 0,
  )

  const captchaRequiredMessage =
    'Bezpečnostná kontrola sa nepodarila. Obnovte stránku a skúste znova.'

  function trimCaptchaToken(token: string): string | undefined {
    const trimmed = token.trim()
    return trimmed || undefined
  }

  /** Returns a user-facing error when captcha is required but missing; null when OK to proceed. */
  function requireCaptchaToken(token: string): string | null {
    if (!turnstileEnabled.value) return null
    if (!trimCaptchaToken(token)) return captchaRequiredMessage
    return null
  }

  function supabaseCaptchaOptions(token: string): { captchaToken: string } | undefined {
    const trimmed = trimCaptchaToken(token)
    if (!turnstileEnabled.value || !trimmed) return undefined
    return { captchaToken: trimmed }
  }

  return {
    turnstileEnabled,
    captchaRequiredMessage,
    trimCaptchaToken,
    requireCaptchaToken,
    supabaseCaptchaOptions,
  }
}
