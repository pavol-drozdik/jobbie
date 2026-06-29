import { describe, expect, it } from 'vitest'
import { mapSupabaseLoginError } from './map-supabase-login-error'
import { S } from './strings'

describe('mapSupabaseLoginError', () => {
  it('maps captcha_failed', () => {
    expect(mapSupabaseLoginError('captcha_failed', null)).toBe(S.forgotPasswordCaptchaFailed)
  })

  it('maps validation_failed with captcha message', () => {
    expect(
      mapSupabaseLoginError('validation_failed', 'captcha protection: request disallowed'),
    ).toBe(S.forgotPasswordCaptchaFailed)
  })

  it('maps email_not_confirmed', () => {
    expect(mapSupabaseLoginError('email_not_confirmed', null)).toBe(S.loginEmailNotConfirmed)
  })

  it('maps invalid_credentials generically', () => {
    expect(mapSupabaseLoginError('invalid_credentials', null)).toBe(
      'Nesprávny e-mail alebo heslo. Skontrolujte údaje a skúste znova.',
    )
  })
})
