import { describe, expect, it } from 'vitest'
import { canPurchaseBilling } from './billing-eligibility'

describe('canPurchaseBilling', () => {
  it('allows company accounts', () => {
    expect(canPurchaseBilling({ role: 'company' })).toBe(true)
  })

  it('allows individuals with customer role', () => {
    expect(
      canPurchaseBilling({ role: 'individual', customer_role: true, provider_role: false }),
    ).toBe(true)
  })

  it('allows individuals with provider role', () => {
    expect(
      canPurchaseBilling({ role: 'individual', customer_role: false, provider_role: true }),
    ).toBe(true)
  })

  it('blocks job-seeker-only individuals', () => {
    expect(
      canPurchaseBilling({ role: 'individual', customer_role: false, provider_role: false }),
    ).toBe(false)
  })

  it('blocks missing profile', () => {
    expect(canPurchaseBilling(null)).toBe(false)
  })
})
