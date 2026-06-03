import {
  mapCompanyAdForViewer,
  redactPublicCompanyAdFields,
} from './public-response.mapper';
import type { CompanyAdResponseDto } from './company-ads.dto';

function baseAd(
  overrides: Partial<CompanyAdResponseDto> = {},
): CompanyAdResponseDto {
  return {
    id: 'ad-1',
    owner_id: 'owner-1',
    thumbnail_url: null,
    title: 'Test ad',
    body: 'Body',
    category: 'stavba',
    status: 'active',
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    profile_type: 'company',
    tagline: null,
    region: 'Bratislavský kraj',
    city: 'Bratislava',
    street_address: 'Hlavná 1',
    postal_code: '81101',
    show_exact_address: false,
    price_type: 'negotiable',
    price_min: null,
    price_max: null,
    price_negotiable: true,
    price_note: null,
    availability: null,
    works_weekends: false,
    evening_hours: false,
    emergency_service: false,
    contact_person: 'Jana Nováková',
    contact_email: 'jana@example.sk',
    contact_phone: '+421900000001',
    website: null,
    preferred_contact_method: 'platform',
    show_phone_publicly: false,
    show_email_publicly: true,
    ico: '12345678',
    dic: '2023456789',
    ic_dph: 'SK2023456789',
    founded_year: null,
    employee_count: null,
    duration_months: 3,
    services: [],
    specializations: [],
    certifications: [],
    service_areas: ['local_city'],
    custom_service_areas: [],
    gallery_items: [],
    ...overrides,
  };
}

describe('company-ads public-response.mapper', () => {
  it('redacts contact email/phone and tax IDs per visibility flags', () => {
    const out = redactPublicCompanyAdFields(baseAd());
    expect(out.contact_person).toBe('Jana Nováková');
    expect(out.contact_email).toBe('jana@example.sk');
    expect(out.contact_phone).toBeNull();
    expect(out.street_address).toBeNull();
    expect(out.ico).toBeNull();
    expect(out.dic).toBeNull();
    expect(out.ic_dph).toBeNull();
  });

  it('returns full dto for owner viewer', () => {
    const dto = baseAd();
    const out = mapCompanyAdForViewer(dto, { userId: 'owner-1' });
    expect(out.contact_phone).toBe('+421900000001');
    expect(out.ico).toBe('12345678');
  });
});
