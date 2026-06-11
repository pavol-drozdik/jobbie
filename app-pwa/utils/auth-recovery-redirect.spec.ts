import { describe, expect, it } from 'vitest'
import { resolveAuthRedirectOrigin } from '~/utils/auth-recovery'

describe('resolveAuthRedirectOrigin', () => {
  it('prefers configured site URL', () => {
    expect(resolveAuthRedirectOrigin('https://jobbie.sk')).toBe('https://jobbie.sk')
    expect(resolveAuthRedirectOrigin('https://jobbie.sk/')).toBe('https://jobbie.sk')
  })

  it('returns empty string without site URL on server', () => {
    expect(resolveAuthRedirectOrigin('')).toBe('')
  })
})
