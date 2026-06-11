import { describe, expect, it } from 'vitest'
import {
  isAuthCallbackRoute,
  isAuthRecoveryInUrl,
  readRecoveryHandoffFromRoute,
} from '~/utils/auth-recovery'

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
