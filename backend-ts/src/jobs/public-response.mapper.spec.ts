import { redactPublicJobFields, mapJobForViewer } from './public-response.mapper';
import type { JobOfferResponseDto } from './jobs.dto';

function baseJob(
  overrides: Partial<JobOfferResponseDto> = {},
): JobOfferResponseDto {
  return {
    id: 'job-1',
    company_id: 'company-1',
    title: 'Test',
    description: 'Desc',
    location: null,
    location_address: null,
    location_lat: null,
    location_lng: null,
    contract_type: null,
    requirements: null,
    salary: null,
    job_type: null,
    work_mode: null,
    expires_at: null,
    is_draft: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    category: null,
    is_urgent: false,
    is_featured: false,
    compensation_type: null,
    compensation_amount: null,
    workers_needed: 1,
    application_deadline: null,
    completion_deadline: null,
    employer_email: 'secret@employer.sk',
    employer_name: null,
    photos: [],
    applications_count: 0,
    work_from_home: false,
    salary_type: null,
    salary_min: null,
    salary_max: null,
    education_levels: [],
    benefits: [],
    suitable_for: [],
    driver_licenses: [],
    work_shift_modes: [],
    languages: [],
    pc_skills: [],
    start_type: null,
    start_date: null,
    employment_types: [],
    work_modes: [],
    city: null,
    postal_code: null,
    show_exact_address: false,
    salary_negotiable: false,
    required_experience: null,
    weekly_hours: null,
    estimated_hours: null,
    own_car_required: false,
    application_method: null,
    contact_person: null,
    contact_email: 'contact@job.sk',
    contact_phone: '+421900000000',
    show_phone_publicly: false,
    application_url: null,
    required_documents: [],
    responsibilities: null,
    requirements_text: null,
    offer_text: null,
    skill_tags: [],
    is_foreign: false,
    ...overrides,
  };
}

describe('public-response.mapper', () => {
  it('redacts contact fields for public consumers', () => {
    const out = redactPublicJobFields(baseJob());
    expect(out.employer_email).toBeNull();
    expect(out.contact_email).toBeNull();
    expect(out.contact_phone).toBeNull();
  });

  it('keeps phone when show_phone_publicly', () => {
    const out = redactPublicJobFields(
      baseJob({ show_phone_publicly: true }),
    );
    expect(out.contact_phone).toBe('+421900000000');
    expect(out.employer_email).toBeNull();
  });

  it('redacts location_address when show_exact_address is false', () => {
    const out = redactPublicJobFields(
      baseJob({
        location_address: 'Hlavná 1, Bratislava',
        show_exact_address: false,
      }),
    );
    expect(out.location_address).toBeNull();
  });

  it('keeps location_address when show_exact_address is true', () => {
    const out = redactPublicJobFields(
      baseJob({
        location_address: 'Hlavná 1, Bratislava',
        show_exact_address: true,
      }),
    );
    expect(out.location_address).toBe('Hlavná 1, Bratislava');
  });

  it('returns full dto for owner', () => {
    const dto = baseJob();
    const out = mapJobForViewer(dto, { userId: 'company-1' });
    expect(out.employer_email).toBe('secret@employer.sk');
    expect(out.contact_email).toBe('contact@job.sk');
  });
});
