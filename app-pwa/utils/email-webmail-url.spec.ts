import { describe, expect, it } from 'vitest'
import { resolveWebmailUrl } from '~/utils/email-webmail-url'

describe('resolveWebmailUrl', () => {
  it('maps common providers', () => {
    expect(resolveWebmailUrl('user@gmail.com')).toBe('https://mail.google.com')
    expect(resolveWebmailUrl('user@outlook.com')).toBe('https://outlook.live.com/mail/')
    expect(resolveWebmailUrl('user@seznam.cz')).toBe('https://email.seznam.cz')
    expect(resolveWebmailUrl('user@centrum.sk')).toBe('https://mail.centrum.sk')
  })

  it('returns null for unknown domains', () => {
    expect(resolveWebmailUrl('user@example.com')).toBeNull()
    expect(resolveWebmailUrl('not-an-email')).toBeNull()
  })
})
