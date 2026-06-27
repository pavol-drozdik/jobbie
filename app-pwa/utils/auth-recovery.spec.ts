import { describe, expect, it } from 'vitest'
import {
  hashHasSensitiveAuthHandoff,
  hashParamNames,
  isAuthCallbackRoute,
  isAuthRecoveryInUrl,
  readRecoveryHandoffFromRoute,
} from '~/utils/auth-recovery'

describe('hashParamNames', () => {
  it('parses hash fragment keys', () => {
    expect(hashParamNames('#access_token=abc&type=recovery')).toEqual(
      new Set(['access_token', 'type']),
    )
  })

  it('returns empty set for blank hash', () => {
    expect(hashParamNames('')).toEqual(new Set())
    expect(hashParamNames('#')).toEqual(new Set())
  })
})

describe('hashHasSensitiveAuthHandoff', () => {
  it('detects access_token in hash', () => {
    expect(hashHasSensitiveAuthHandoff('#access_token=secret&type=bearer')).toBe(true)
  })

  it('detects recovery type in hash', () => {
    expect(hashHasSensitiveAuthHandoff('#type=recovery&other=1')).toBe(true)
  })

  it('returns false for unrelated hash', () => {
    expect(hashHasSensitiveAuthHandoff('#foo=bar')).toBe(false)
  })
})

describe('readRecoveryHandoffFromRoute', () => {
  it('reads token_hash, type, and code from query', () => {
    expect(
      readRecoveryHandoffFromRoute({
        query: {
          token_hash: 'abc',
          type: 'recovery',
          code: 'xyz',
        },
      }),
    ).toEqual({
      tokenHash: 'abc',
      type: 'recovery',
      code: 'xyz',
    })
  })
})

describe('isAuthRecoveryInUrl', () => {
  it('detects recovery query handoff', () => {
    expect(
      isAuthRecoveryInUrl({
        query: { token_hash: 'abc', type: 'recovery' },
      }),
    ).toBe(true)
  })

  it('returns false without recovery params', () => {
    expect(isAuthRecoveryInUrl({ query: { redirect: '/home' } })).toBe(false)
  })
})

describe('isAuthCallbackRoute', () => {
  it('matches /auth/callback', () => {
    expect(isAuthCallbackRoute('/auth/callback')).toBe(true)
    expect(isAuthCallbackRoute('/auth/callback/')).toBe(true)
  })

  it('does not match other auth routes', () => {
    expect(isAuthCallbackRoute('/auth/login')).toBe(false)
  })
})
