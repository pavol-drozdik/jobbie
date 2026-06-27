import { describe, expect, it } from 'vitest'
import { registrationCaptchaVerifyFailed } from '~/composables/useRegistrationSignUp'
import { S } from '~/utils/strings'

describe('registrationCaptchaVerifyFailed', () => {
  it('returns network error message when API is unreachable (503)', () => {
    expect(registrationCaptchaVerifyFailed(503)).toBe(S.resetPasswordNetworkError)
  })

  it('returns network error message when fetch failed (status 0)', () => {
    expect(registrationCaptchaVerifyFailed(0)).toBe(S.resetPasswordNetworkError)
  })

  it('returns captcha failure when verify rejects token', () => {
    expect(registrationCaptchaVerifyFailed(200, { ok: false })).toBe(
      'Overenie captcha zlyhalo.',
    )
  })

  it('returns null when captcha verify succeeded', () => {
    expect(registrationCaptchaVerifyFailed(200, { ok: true })).toBeNull()
  })

  it('returns null when captcha verify is skipped (no server secret)', () => {
    expect(registrationCaptchaVerifyFailed(200, { skipped: true })).toBeNull()
  })
})
