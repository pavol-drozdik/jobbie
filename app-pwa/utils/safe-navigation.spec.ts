import { describe, expect, it } from 'vitest'
import {
  isSafeInternalPath,
  normalizeWebsiteHref,
  resolveSafeInternalPath,
  sanitizeExternalHref,
} from './safe-navigation'

const FALLBACK = '/'

describe('resolveSafeInternalPath', () => {
  it('allows legitimate nested paths', () => {
    expect(resolveSafeInternalPath('/dashboard', FALLBACK)).toBe('/dashboard')
    expect(resolveSafeInternalPath('/nastavenia/kredity', FALLBACK)).toBe(
      '/nastavenia/kredity',
    )
    expect(resolveSafeInternalPath('/ponuka/abc?q=1#x', FALLBACK)).toBe(
      '/ponuka/abc?q=1#x',
    )
  })

  it('rejects open-redirect and scheme tricks', () => {
    expect(resolveSafeInternalPath('//evil.example', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('/\\evil.example', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('/\\evil.example', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('/%2F%2Fevil.example', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('/%5C%5Cevil.example', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('javascript:alert(1)', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('data:text/html,abc', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('https://evil.example', FALLBACK)).toBe(FALLBACK)
  })

  it('rejects empty and whitespace', () => {
    expect(resolveSafeInternalPath('', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath('   ', FALLBACK)).toBe(FALLBACK)
    expect(resolveSafeInternalPath(null, FALLBACK)).toBe(FALLBACK)
  })
})

describe('isSafeInternalPath', () => {
  it('mirrors resolveSafeInternalPath acceptance', () => {
    expect(isSafeInternalPath('/dashboard')).toBe(true)
    expect(isSafeInternalPath('//evil.example')).toBe(false)
  })
})

describe('sanitizeExternalHref', () => {
  it('allows https and optional http', () => {
    expect(sanitizeExternalHref('https://linkedin.com/in/foo')).toBe(
      'https://linkedin.com/in/foo',
    )
    expect(
      sanitizeExternalHref('http://example.com', { allowHttp: true }),
    ).toBe('http://example.com/')
  })

  it('rejects dangerous schemes', () => {
    expect(sanitizeExternalHref('javascript:alert(1)')).toBeNull()
    expect(sanitizeExternalHref('data:text/html,x')).toBeNull()
    expect(sanitizeExternalHref('vbscript:msgbox(1)')).toBeNull()
  })
})

describe('normalizeWebsiteHref', () => {
  it('prefixes https and rejects javascript', () => {
    expect(normalizeWebsiteHref('example.com')).toBe('https://example.com/')
    expect(normalizeWebsiteHref('javascript:alert(1)')).toBeNull()
  })
})
