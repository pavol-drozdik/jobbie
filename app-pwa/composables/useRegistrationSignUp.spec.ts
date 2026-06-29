import { describe, expect, it } from 'vitest'
import {
  isSignUpDuplicateEmail,
  mapSignUpError,
  registrationCaptchaVerifyFailed,
} from '~/composables/useRegistrationSignUp'
import { S } from '~/utils/strings'

describe('isSignUpDuplicateEmail', () => {
  it('detects Supabase empty identities response', () => {
    expect(isSignUpDuplicateEmail({ identitiesCount: 0 })).toBe(true)
  })

  it('detects known duplicate error messages', () => {
    expect(
      isSignUpDuplicateEmail({ errorMessage: 'User already registered' }),
    ).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isSignUpDuplicateEmail({ errorMessage: 'Invalid password' })).toBe(false)
  })
})

describe('mapSignUpError', () => {
  it('maps duplicate email errors to Slovak copy', () => {
    expect(mapSignUpError('User already registered')).toBe(S.authSignupEmailTaken)
  })

  it('maps minimum age database errors', () => {
    expect(mapSignUpError('individual_registration_minimum_age')).toContain('16')
  })

  it('maps user_banned to account closed copy', () => {
    expect(mapSignUpError('User is banned')).toBe(S.authAccountClosed)
  })
})

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
