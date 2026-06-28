import { describe, expect, it } from 'vitest'
import {
  apiWebSocketOrigin,
  buildContentSecurityPolicy,
  buildPermissionsPolicy,
  buildPlatformSecurityHeaders,
  derivePosthogAssetsOrigin,
  pathShouldIncludeCsp,
  resolvePlatformCspOrigins,
} from './platform-csp'

const prodOrigins = {
  apiOrigin: 'https://api.example.com',
  apiWebSocketOrigin: 'wss://api.example.com',
  cdnOrigin: 'https://cdn.example.com',
  supabaseOrigin: 'https://abc.supabase.co',
  posthogHost: 'https://eu.i.posthog.com',
}

describe('buildContentSecurityPolicy', () => {
  it('uses nonce and strict-dynamic without unsafe-inline when nonce is set', () => {
    const csp = buildContentSecurityPolicy({
      ...prodOrigins,
      scriptNonce: 'test-nonce-value',
    })
    expect(csp).toContain("'nonce-test-nonce-value'")
    expect(csp).toContain("'strict-dynamic'")
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('allows Clarity scripts subdomain in script-src', () => {
    const csp = buildContentSecurityPolicy(prodOrigins)
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrc).toContain('https://www.clarity.ms')
    expect(scriptSrc).toContain('https://*.clarity.ms')
  })

  it('allows API WebSocket and CDN fonts in connect-src / font-src', () => {
    const csp = buildContentSecurityPolicy(prodOrigins)
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src'))
    const fontSrc = csp.split(';').find((d) => d.trim().startsWith('font-src'))
    expect(connectSrc).toContain('wss://api.example.com')
    expect(connectSrc).toContain('https://cdn.example.com')
    expect(fontSrc).toContain('https://cdn.example.com')
  })

  it('derives wss origin from https API base', () => {
    expect(apiWebSocketOrigin('https://api.jobbie.sk')).toBe('wss://api.jobbie.sk')
    expect(apiWebSocketOrigin('http://localhost:8000')).toBe('ws://localhost:8000')
  })

  it('falls back to unsafe-inline in dev when no nonce', () => {
    const csp = buildContentSecurityPolicy({
      apiOrigin: 'http://localhost:8000',
      supabaseOrigin: '',
      posthogHost: 'https://eu.i.posthog.com',
    })
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
  })

  it('allows PostHog assets origin derived from api host', () => {
    const csp = buildContentSecurityPolicy(prodOrigins)
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src'))
    expect(connectSrc).toContain('https://eu.i.posthog.com')
    expect(connectSrc).toContain('https://eu-assets.i.posthog.com')
    expect(derivePosthogAssetsOrigin('https://eu.i.posthog.com')).toBe(
      'https://eu-assets.i.posthog.com',
    )
  })
})

describe('resolvePlatformCspOrigins', () => {
  it('uses runtime public config when process.env is unset on the edge', () => {
    const previous = process.env.NUXT_PUBLIC_API_BASE_URL
    delete process.env.NUXT_PUBLIC_API_BASE_URL
    try {
      const origins = resolvePlatformCspOrigins({
        apiBaseUrl: 'https://api.jobbie.sk',
        supabaseUrl: 'https://ctleiabsrsqxjlnuordj.supabase.co',
      })
      expect(origins.apiOrigin).toBe('https://api.jobbie.sk')
      expect(origins.apiWebSocketOrigin).toBe('wss://api.jobbie.sk')
      expect(origins.supabaseOrigin).toBe('https://ctleiabsrsqxjlnuordj.supabase.co')
    } finally {
      if (previous === undefined) {
        delete process.env.NUXT_PUBLIC_API_BASE_URL
      } else {
        process.env.NUXT_PUBLIC_API_BASE_URL = previous
      }
    }
  })
})

describe('buildPlatformSecurityHeaders', () => {
  it('includes production API origin in CSP connect-src from publicConfig', () => {
    const headers = buildPlatformSecurityHeaders({
      publicConfig: {
        apiBaseUrl: 'https://api.jobbie.sk',
        supabaseUrl: 'https://ctleiabsrsqxjlnuordj.supabase.co',
        posthogHost: 'https://eu.i.posthog.com',
      },
    })
    const csp = headers['Content-Security-Policy'] ?? ''
    expect(csp).toContain('https://api.jobbie.sk')
    expect(csp).toContain('wss://api.jobbie.sk')
    expect(csp).not.toContain('localhost:8000')
  })
})

describe('buildPermissionsPolicy', () => {
  it('does not use wildcard subdomain for payment', () => {
    const policy = buildPermissionsPolicy()
    expect(policy).toContain('payment=(self')
    expect(policy).toContain('"https://js.stripe.com"')
    expect(policy).toContain('"https://hooks.stripe.com"')
    expect(policy).not.toContain('https://*.stripe.com')
  })
})

describe('pathShouldIncludeCsp', () => {
  it('skips hashed static assets', () => {
    expect(pathShouldIncludeCsp('/_nuxt/entry.js')).toBe(false)
    expect(pathShouldIncludeCsp('/_ipx/w_200/image.jpg')).toBe(false)
    expect(pathShouldIncludeCsp('/assets/foo.png')).toBe(false)
  })

  it('includes HTML document paths', () => {
    expect(pathShouldIncludeCsp('/')).toBe(true)
    expect(pathShouldIncludeCsp('/auth/login')).toBe(true)
  })
})
