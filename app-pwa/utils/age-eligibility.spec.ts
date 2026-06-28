import { describe, expect, it } from 'vitest'
import {
  isAtLeastAge,
  maxBirthDateForMinAge,
  parseIsoDateOnly,
  validateIndividualRegistrationBirthDate,
} from './age-eligibility'

describe('age-eligibility', () => {
  const ref = new Date(2026, 5, 27)

  it('parses valid ISO date-only strings', () => {
    const parsed = parseIsoDateOnly('2010-06-27')
    expect(parsed).not.toBeNull()
    expect(parsed?.getFullYear()).toBe(2010)
  })

  it('rejects invalid calendar dates', () => {
    expect(parseIsoDateOnly('2010-02-30')).toBeNull()
    expect(parseIsoDateOnly('not-a-date')).toBeNull()
  })

  it('allows exactly 16 years old on reference date', () => {
    expect(isAtLeastAge(new Date(2010, 5, 27), 16, ref)).toBe(true)
  })

  it('rejects one day younger than 16', () => {
    expect(isAtLeastAge(new Date(2010, 5, 28), 16, ref)).toBe(false)
  })

  it('returns max birth date for minimum age', () => {
    expect(maxBirthDateForMinAge(16, ref)).toBe('2010-06-27')
  })

  it('validates individual registration birth date', () => {
    expect(validateIndividualRegistrationBirthDate('2010-06-27', ref)).toBeNull()
    expect(validateIndividualRegistrationBirthDate('2010-06-28', ref)).toMatch(/16 rokov/)
    expect(validateIndividualRegistrationBirthDate('invalid', ref)).toMatch(/platný dátum/)
  })
})
