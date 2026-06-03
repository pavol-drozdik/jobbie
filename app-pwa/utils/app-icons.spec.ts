import { describe, expect, it } from 'vitest'

import { CATEGORIES } from '~/utils/job'

import {

  getCategoryIconMapKeys,

  getCategoryIconName,

  LEGACY_CATEGORY_SLUG_ALIASES,

  normalizeCategorySlug,

} from '~/utils/app-icons'



describe('app-icons category map', () => {

  it('maps every canonical category slug to an icon', () => {

    for (const slug of CATEGORIES) {

      expect(getCategoryIconName(slug)).not.toBe('briefcase')

    }

  })



  it('icon map keys match CATEGORIES exactly', () => {

    expect(getCategoryIconMapKeys().sort()).toEqual([...CATEGORIES].sort())

  })



  it('uses truck for auto (doprava / logistika), not car', () => {

    expect(getCategoryIconName('auto')).toBe('truck')

  })



  it('normalizes legacy doprava alias to auto icon', () => {

    expect(normalizeCategorySlug('doprava')).toBe('auto')

    expect(getCategoryIconName('doprava')).toBe('truck')

  })



  it('normalizes slug casing', () => {

    expect(getCategoryIconName('Auto')).toBe('truck')

    expect(getCategoryIconName(' AUTO ')).toBe('truck')

  })



  it.each(

    Object.entries(LEGACY_CATEGORY_SLUG_ALIASES) as [string, (typeof CATEGORIES)[number]][],

  )('maps legacy slug %s to canonical %s icon', (legacy, canonical) => {

    expect(normalizeCategorySlug(legacy)).toBe(canonical)

    expect(getCategoryIconName(legacy)).toBe(getCategoryIconName(canonical))

    expect(getCategoryIconName(legacy)).not.toBe('briefcase')

  })

})


