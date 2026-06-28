import { describe, expect, it } from 'vitest'
import { readPosthogPublicConfig } from './posthog-client'
import { INJECTED_ANALYTICS_SCRIPT_RE } from './gtm-client'

describe('readPosthogPublicConfig', () => {
  it('returns null when key is empty', () => {
    expect(readPosthogPublicConfig({ posthogKey: '' })).toBeNull()
    expect(readPosthogPublicConfig({ posthogKey: '   ' })).toBeNull()
  })

  it('reads key, host, and defaults from public config without composables', () => {
    expect(
      readPosthogPublicConfig({
        posthogKey: ' phc_test ',
        posthogHost: ' https://eu.i.posthog.com ',
        posthogDefaults: '2025-05-24',
      }),
    ).toEqual({
      key: 'phc_test',
      host: 'https://eu.i.posthog.com',
      defaults: '2025-05-24',
    })
  })

  it('defaults host to EU when posthogHost is omitted', () => {
    expect(readPosthogPublicConfig({ posthogKey: 'phc_test' })).toEqual({
      key: 'phc_test',
      host: 'https://eu.i.posthog.com',
      defaults: undefined,
    })
  })
})

describe('INJECTED_ANALYTICS_SCRIPT_RE', () => {
  it('matches Clarity and Bing analytics script URLs', () => {
    expect(INJECTED_ANALYTICS_SCRIPT_RE.test('https://www.clarity.ms/tag/foo')).toBe(true)
    expect(INJECTED_ANALYTICS_SCRIPT_RE.test('https://scripts.clarity.ms/0.8/foo')).toBe(true)
    expect(INJECTED_ANALYTICS_SCRIPT_RE.test('https://c.bing.com/c.gif')).toBe(true)
    expect(INJECTED_ANALYTICS_SCRIPT_RE.test('https://www.googletagmanager.com/gtm.js?id=GTM-1')).toBe(
      false,
    )
  })
})
