import { describe, expect, it } from 'vitest'
import {
  hasProfileStatsAccess,
  resolveProfileStatsDashboardPath,
} from '~/utils/dashboard-default-route'

describe('resolveProfileStatsDashboardPath', () => {
  it('uses customer dashboard when only customer_role', () => {
    expect(
      resolveProfileStatsDashboardPath({ customer_role: true, provider_role: false }),
    ).toBe('/dashboard/zakaznik')
  })

  it('uses provider dashboard when only provider_role', () => {
    expect(
      resolveProfileStatsDashboardPath({ customer_role: false, provider_role: true }),
    ).toBe('/dashboard/profesional')
  })

  it('prefers customer dashboard when both roles (tabs on page)', () => {
    expect(
      resolveProfileStatsDashboardPath({ customer_role: true, provider_role: true }),
    ).toBe('/dashboard/zakaznik')
  })
})

describe('hasProfileStatsAccess', () => {
  it('is false without either role', () => {
    expect(hasProfileStatsAccess({ customer_role: false, provider_role: false })).toBe(false)
  })

  it('is true with either role', () => {
    expect(hasProfileStatsAccess({ customer_role: true, provider_role: false })).toBe(true)
  })
})
