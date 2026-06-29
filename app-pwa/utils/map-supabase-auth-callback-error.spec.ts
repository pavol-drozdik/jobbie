import { describe, expect, it } from 'vitest'
import {
  mapSupabaseAuthCallbackError,
  readSupabaseAuthErrorFromSearchParams,
  readSupabaseAuthErrorFromUrl,
} from '~/utils/map-supabase-auth-callback-error'
import { S } from '~/utils/strings'

describe('readSupabaseAuthErrorFromSearchParams', () => {
  it('returns null when error is missing', () => {
    expect(readSupabaseAuthErrorFromSearchParams(new URLSearchParams('foo=bar'))).toBeNull()
  })

  it('reads error fields from params', () => {
    expect(
      readSupabaseAuthErrorFromSearchParams(
        new URLSearchParams(
          'error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user',
        ),
      ),
    ).toEqual({
      error: 'server_error',
      errorCode: 'unexpected_failure',
      errorDescription: 'Database error saving new user',
    })
  })
})

describe('readSupabaseAuthErrorFromUrl', () => {
  it('reads from query string', () => {
    expect(
      readSupabaseAuthErrorFromUrl(
        'https://www.jobbie.sk/?error=server_error&error_description=Database+error+saving+new+user',
      ),
    ).toEqual({
      error: 'server_error',
      errorCode: undefined,
      errorDescription: 'Database error saving new user',
    })
  })

  it('reads from hash when query is clean', () => {
    expect(
      readSupabaseAuthErrorFromUrl(
        'https://www.jobbie.sk/#error=server_error&error_description=OAuth+failed',
      ),
    ).toEqual({
      error: 'server_error',
      errorCode: undefined,
      errorDescription: 'OAuth failed',
    })
  })
})

describe('mapSupabaseAuthCallbackError', () => {
  it('routes database signup failures to register', () => {
    expect(
      mapSupabaseAuthCallbackError(
        'server_error',
        'unexpected_failure',
        'Database error saving new user',
      ),
    ).toEqual({
      message: S.authSignupDatabaseFailed,
      destination: 'register',
    })
  })

  it('routes birth date trigger failures to register', () => {
    expect(
      mapSupabaseAuthCallbackError(null, null, null, 'individual_registration_requires_birth_date'),
    ).toEqual({
      message: S.authSignupDatabaseFailed,
      destination: 'register',
    })
  })

  it('routes captcha failures to login with captcha copy', () => {
    expect(
      mapSupabaseAuthCallbackError('server_error', 'captcha_failed', 'captcha verification failed'),
    ).toEqual({
      message: S.authOAuthCaptchaFailed,
      destination: 'login',
    })
  })

  it('routes generic oauth errors to login', () => {
    expect(mapSupabaseAuthCallbackError('access_denied', null, null)).toEqual({
      message: S.authOAuthCancelled,
      destination: 'login',
    })
  })

  it('uses error_description on login for other failures', () => {
    expect(
      mapSupabaseAuthCallbackError('server_error', null, 'Email link is invalid or has expired'),
    ).toEqual({
      message: 'Email link is invalid or has expired',
      destination: 'login',
    })
  })

  it('routes user_banned to login by default', () => {
    expect(mapSupabaseAuthCallbackError(null, 'user_banned', 'User is banned')).toEqual({
      message: S.authAccountClosed,
      destination: 'login',
    })
  })

  it('routes user_banned to register when OAuth signup is pending', () => {
    expect(
      mapSupabaseAuthCallbackError(null, 'user_banned', 'User is banned', null, {
        oauthSignupPending: true,
      }),
    ).toEqual({
      message: S.authAccountClosed,
      destination: 'register',
    })
  })

  it('maps pkce verifier missing to OAuth copy', () => {
    expect(
      mapSupabaseAuthCallbackError(
        null,
        'pkce_code_verifier_missing',
        'PKCE code verifier not found in storage.',
      ),
    ).toEqual({
      message: S.authOAuthPkceVerifierMissing,
      destination: 'login',
    })
  })
})
