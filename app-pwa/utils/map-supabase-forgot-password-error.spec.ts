import { describe, expect, it } from 'vitest'
import { S } from '~/utils/strings'
import { mapSupabaseForgotPasswordError } from '~/utils/map-supabase-forgot-password-error'

describe('mapSupabaseForgotPasswordError', () => {
  it('maps rate limit', () => {
    expect(mapSupabaseForgotPasswordError('over_email_send_rate_limit', null)).toBe(
      S.forgotPasswordRateLimited,
    )
  })

  it('maps captcha failures', () => {
    expect(mapSupabaseForgotPasswordError('captcha_failed', null)).toBe(
      S.forgotPasswordCaptchaFailed,
    )
    expect(
      mapSupabaseForgotPasswordError('validation_failed', 'captcha verification failed'),
    ).toBe(S.forgotPasswordCaptchaFailed)
  })

  it('returns null for unknown errors (no enumeration)', () => {
    expect(mapSupabaseForgotPasswordError('user_not_found', 'User not found')).toBeNull()
  })
})
