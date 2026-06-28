import { describe, expect, it } from 'vitest'
import {
  buildCanonicalRedirectUrl,
  isJobbiePagesDevHost,
} from './preview-host-redirect'

describe('preview-host-redirect', () => {
  describe('isJobbiePagesDevHost', () => {
    it('matches production pages.dev hostname', () => {
      expect(isJobbiePagesDevHost('jobbie-pwa.pages.dev')).toBe(true)
    })

    it('matches branch and deploy preview hostnames', () => {
      expect(isJobbiePagesDevHost('staging.jobbie-pwa.pages.dev')).toBe(true)
      expect(isJobbiePagesDevHost('abc123.jobbie-pwa.pages.dev')).toBe(true)
    })

    it('ignores custom domains and other projects', () => {
      expect(isJobbiePagesDevHost('www.jobbie.sk')).toBe(false)
      expect(isJobbiePagesDevHost('jobbie.sk')).toBe(false)
      expect(isJobbiePagesDevHost('other-pwa.pages.dev')).toBe(false)
      expect(isJobbiePagesDevHost('localhost:3001')).toBe(false)
    })
  })

  describe('buildCanonicalRedirectUrl', () => {
    it('preserves path and query', () => {
      expect(
        buildCanonicalRedirectUrl('https://www.jobbie.sk', '/platba', '?type=credits'),
      ).toBe('https://www.jobbie.sk/platba?type=credits')
    })
  })
})
