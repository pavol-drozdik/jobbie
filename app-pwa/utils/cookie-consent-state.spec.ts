import { describe, expect, it } from 'vitest'
import {
  buildConsentPayload,
  categoriesFromPayload,
  COOKIE_POLICY_VERSION,
  hasValidConsentChoice,
  normalizeConsentPayload,
} from './cookie-consent-state'

describe('cookie-consent-state', () => {
  it('buildConsentPayload produces valid v2 payload', () => {
    const payload = buildConsentPayload({
      analytics: true,
      marketing: false,
      personalization: false,
    })
    expect(payload.v).toBe(2)
    expect(payload.necessary).toBe(true)
    expect(payload.analytics).toBe(true)
    expect(payload.policy).toBe(COOKIE_POLICY_VERSION)
    expect(typeof payload.ts).toBe('string')
    expect(hasValidConsentChoice(payload)).toBe(true)
  })

  it('hasValidConsentChoice accepts legacy v1 cookies', () => {
    const v1 = { v: 1 as const, analytics: true, ts: '2026-01-01T00:00:00.000Z' }
    expect(hasValidConsentChoice(v1)).toBe(true)
    expect(categoriesFromPayload(v1).analytics).toBe(true)
  })

  it('normalizeConsentPayload maps v1 to v2 with marketing/personalization false', () => {
    const v1 = { v: 1 as const, analytics: false, ts: '2026-01-01T00:00:00.000Z' }
    const normalized = normalizeConsentPayload(v1)
    expect(normalized?.marketing).toBe(false)
    expect(normalized?.personalization).toBe(false)
    expect(normalized?.analytics).toBe(false)
  })

  it('hasValidConsentChoice rejects v2 with outdated policy', () => {
    const outdated = buildConsentPayload({
      analytics: true,
      marketing: false,
      personalization: false,
    })
    outdated.policy = COOKIE_POLICY_VERSION - 1
    expect(hasValidConsentChoice(outdated)).toBe(false)
  })
})
