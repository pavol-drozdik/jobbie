import { describe, expect, it } from 'vitest'
import { canPurchaseBilling } from './billing-eligibility'

describe('canPurchaseBilling', () => {
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

  it('allows worker + customer', () => {
    expect(
      canPurchaseBilling({
        role: 'individual',
        customer_role: true,
        provider_role: false,
        worker_role: true,
      }),
    ).toBe(true)
  })

  it('allows worker + provider', () => {
    expect(
      canPurchaseBilling({
        role: 'individual',
        customer_role: false,
        provider_role: true,
        worker_role: true,
      }),
    ).toBe(true)
  })

  it('allows all three activity roles', () => {
    expect(
      canPurchaseBilling({
        role: 'individual',
        customer_role: true,
        provider_role: true,
        worker_role: true,
      }),
    ).toBe(true)
  })

  it('blocks job-seeker-only individuals', () => {
    expect(
      canPurchaseBilling({
        role: 'individual',
        customer_role: false,
        provider_role: false,
        worker_role: true,
      }),
    ).toBe(false)
  })

  it('blocks company accounts with worker role only', () => {
    expect(
      canPurchaseBilling({
        role: 'company',
        customer_role: false,
        provider_role: false,
        worker_role: true,
      }),
    ).toBe(false)
  })

  it('allows company accounts with customer role', () => {
    expect(
      canPurchaseBilling({
        role: 'company',
        customer_role: true,
        provider_role: false,
        worker_role: true,
      }),
    ).toBe(true)
  })

  it('blocks missing profile', () => {
    expect(canPurchaseBilling(null)).toBe(false)
  })
})
