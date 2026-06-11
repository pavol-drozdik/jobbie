import { describe, expect, it } from 'vitest'
import { creditCountLabel, creditWordLabel } from './sk-plural'

describe('creditWordLabel', () => {
  it('skloňuje podľa slovenských pravidiel', () => {
    expect(creditWordLabel(1)).toBe('kredit')
    expect(creditWordLabel(2)).toBe('kredity')
    expect(creditWordLabel(4)).toBe('kredity')
    expect(creditWordLabel(5)).toBe('kreditov')
    expect(creditWordLabel(186)).toBe('kreditov')
  })
})

describe('creditCountLabel', () => {
  it('vracia číslo so správnym slovom', () => {
    expect(creditCountLabel(1)).toBe('1 kredit')
    expect(creditCountLabel(3)).toBe('3 kredity')
    expect(creditCountLabel(186)).toBe('186 kreditov')
  })
})
