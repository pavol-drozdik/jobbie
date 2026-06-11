import { describe, expect, it } from 'vitest'
import {
  getPayableCreditUsageRows,
  parsePlanTierCreditCostsFromConfig,
} from './plan-tier-credit-costs'

describe('getPayableCreditUsageRows', () => {
  const matrix = parsePlanTierCreditCostsFromConfig(null)

  it('returns four payable rows for zadarmo plan', () => {
    const rows = getPayableCreditUsageRows(matrix, 'zadarmo')
    expect(rows).toHaveLength(4)
    expect(rows.find((r) => r.key === 'publishUrgentJob')?.cost).toBe(2)
    expect(rows.find((r) => r.key === 'topOfCategory7Days')?.cost).toBe(10)
  })

  it('shows free label for pro urgent and top', () => {
    const rows = getPayableCreditUsageRows(matrix, 'pro')
    expect(rows.find((r) => r.key === 'publishUrgentJob')?.costLabel).toBe('zadarmo')
    expect(rows.find((r) => r.key === 'topOfCategory7Days')?.costLabel).toBe('zadarmo')
  })
})
