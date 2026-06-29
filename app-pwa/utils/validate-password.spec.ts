import { describe, expect, it } from 'vitest'
import { PASSWORD_MIN_LENGTH, validatePassword } from './validate-password'

describe('validatePassword', () => {
  it('exports min length 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('Abc123')).not.toBeNull()
    expect(validatePassword('')).not.toBeNull()
  })

  it('rejects passwords without a letter', () => {
    expect(validatePassword('12345678')).not.toBeNull()
  })

  it('rejects passwords without a digit', () => {
    expect(validatePassword('abcdefgh')).not.toBeNull()
  })

  it('accepts passwords with at least one letter and one digit', () => {
    expect(validatePassword('Abcdef12')).toBeNull()
    expect(validatePassword('heslo123')).toBeNull()
  })
})
