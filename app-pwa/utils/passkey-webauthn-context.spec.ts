import { describe, expect, it } from 'vitest'
import {
  formatPasskeyVerificationFailedMessage,
  passkeyLocalDevSetupHint,
  resolvePasskeyRpId,
} from '~/utils/passkey-webauthn-context'

describe('resolvePasskeyRpId', () => {
  it('returns localhost as-is', () => {
    expect(resolvePasskeyRpId('localhost')).toBe('localhost')
  })

  it('returns registrable domain for subdomains', () => {
    expect(resolvePasskeyRpId('app.jobbie.sk')).toBe('jobbie.sk')
  })
})

describe('passkeyLocalDevSetupHint', () => {
  it('includes current origin for dashboard setup', () => {
    const msg = passkeyLocalDevSetupHint('localhost', 'http://localhost:3001')
    expect(msg).toContain('localhost')
    expect(msg).toContain('http://localhost:3001')
  })
})

describe('formatPasskeyVerificationFailedMessage', () => {
  it('uses local dev hint on loopback', () => {
    const msg = formatPasskeyVerificationFailedMessage('localhost', 'http://localhost:3001')
    expect(msg).toContain('http://localhost:3001')
  })
})
