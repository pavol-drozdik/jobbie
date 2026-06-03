import {
  getCompanyAdOwnerDisplayName,
  getCompanyAdServiceAreasDisplay,
  getCompanyAdServiceAreasFullDisplay,
} from './company-ad-display'

describe('getCompanyAdOwnerDisplayName', () => {
  it('prefers company name for company profile type', () => {
    expect(
      getCompanyAdOwnerDisplayName({
        profile_type: 'company',
        owner_role: 'company',
        owner_company_name: 'Firma s.r.o.',
        owner_display_name: 'Ján',
      }),
    ).toBe('Firma s.r.o.')
  })

  it('prefers display name for freelancer profile type', () => {
    expect(
      getCompanyAdOwnerDisplayName({
        profile_type: 'freelancer',
        owner_role: 'individual',
        owner_company_name: 'Firma s.r.o.',
        owner_display_name: 'Ján Novák',
      }),
    ).toBe('Ján Novák')
  })

  it('does not use contact_person — owner row is the publishing account only', () => {
    expect(
      getCompanyAdOwnerDisplayName({
        profile_type: 'freelancer',
        owner_role: 'individual',
        owner_company_name: null,
        owner_display_name: null,
      }),
    ).toBe('')
  })
})

describe('getCompanyAdServiceAreasDisplay', () => {
  it('maps enum areas and omits custom placeholder', () => {
    expect(getCompanyAdServiceAreasDisplay(['local_city', 'custom'])).toBe('V mojom meste')
    expect(getCompanyAdServiceAreasDisplay(['slovakia', 'online'])).toContain('Celé Slovensko')
  })
})

describe('getCompanyAdServiceAreasFullDisplay', () => {
  it('appends custom tags when custom area is selected', () => {
    expect(
      getCompanyAdServiceAreasFullDisplay({
        service_areas: ['custom', 'region'],
        custom_service_areas: ['Piešťany', 'Trnava'],
      }),
    ).toBe('V celom kraji · Piešťany · Trnava')
  })

  it('shows only custom tags when only custom is selected', () => {
    expect(
      getCompanyAdServiceAreasFullDisplay({
        service_areas: ['custom'],
        custom_service_areas: ['Západné Slovensko'],
      }),
    ).toBe('Západné Slovensko')
  })

  it('returns empty when no areas', () => {
    expect(
      getCompanyAdServiceAreasFullDisplay({
        service_areas: [],
        custom_service_areas: [],
      }),
    ).toBe('')
  })
})
