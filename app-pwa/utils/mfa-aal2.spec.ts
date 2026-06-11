import { describe, expect, it } from 'vitest'
import { collectMfaFactors, findTotpFactor } from '~/utils/mfa-aal2'

describe('collectMfaFactors', () => {
  it('prefers all when present', () => {
    const factors = collectMfaFactors({
      all: [{ id: 'a', factor_type: 'totp', status: 'verified' }],
      totp: [{ id: 'b', factor_type: 'totp', status: 'verified' }],
    })
    expect(factors[0]?.id).toBe('a')
  })

  it('falls back to totp array', () => {
    const factors = collectMfaFactors({
      all: [],
      totp: [{ id: 'b', factor_type: 'totp', status: 'verified' }],
    })
    expect(factors[0]?.id).toBe('b')
  })
})

describe('findTotpFactor', () => {
  it('matches totp case-insensitively', () => {
    const row = findTotpFactor(
      [{ id: 'x', factor_type: 'TOTP', status: 'verified' }],
      'verified',
    )
    expect(row?.id).toBe('x')
  })
})
