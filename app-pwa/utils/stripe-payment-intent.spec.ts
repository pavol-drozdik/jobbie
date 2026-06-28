import { describe, expect, it } from 'vitest'
import {
  isPaymentIntentClientSecret,
  isSetupIntentClientSecret,
  shouldConfirmSetupIntent,
} from './stripe-payment-intent'

describe('shouldConfirmSetupIntent', () => {
  it('prefers SetupIntent client secret prefix', () => {
    expect(
      shouldConfirmSetupIntent('seti_abc_secret_xyz', 'payment', 'payment'),
    ).toBe(true)
  })

  it('prefers PaymentIntent client secret prefix', () => {
    expect(
      shouldConfirmSetupIntent('pi_abc_secret_xyz', 'setup', 'setup'),
    ).toBe(false)
  })

  it('uses server intent_type when secret prefix is ambiguous', () => {
    expect(shouldConfirmSetupIntent('', 'setup', 'payment')).toBe(true)
    expect(shouldConfirmSetupIntent('', 'payment', 'setup')).toBe(false)
  })

  it('falls back to deferred Elements mode', () => {
    expect(shouldConfirmSetupIntent('', undefined, 'setup')).toBe(true)
    expect(shouldConfirmSetupIntent('', undefined, 'payment')).toBe(false)
  })
})

describe('client secret prefix helpers', () => {
  it('detects setup and payment prefixes', () => {
    expect(isSetupIntentClientSecret('seti_123_secret_abc')).toBe(true)
    expect(isPaymentIntentClientSecret('pi_123_secret_abc')).toBe(true)
    expect(isSetupIntentClientSecret('pi_123_secret_abc')).toBe(false)
  })
})
