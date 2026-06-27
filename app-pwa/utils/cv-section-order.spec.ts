import { describe, expect, it } from 'vitest'
import { cvSectionReorderIds, swapCvSectionRow } from './cv-section-order'

const rows = [
  { id: 'a', sort_order: 2 },
  { id: 'b', sort_order: 1 },
  { id: 'c', sort_order: 0 },
]

describe('swapCvSectionRow', () => {
  it('moves a row up in the visual list', () => {
    expect(swapCvSectionRow(rows, 'b', 'up').map((r) => r.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves a row down in the visual list', () => {
    expect(swapCvSectionRow(rows, 'b', 'down').map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('no-ops at the top boundary', () => {
    expect(swapCvSectionRow(rows, 'a', 'up').map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('no-ops at the bottom boundary', () => {
    expect(swapCvSectionRow(rows, 'c', 'down').map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('cvSectionReorderIds', () => {
  it('reverses visual order for the reorder API payload', () => {
    expect(cvSectionReorderIds(rows)).toEqual(['c', 'b', 'a'])
  })
})
