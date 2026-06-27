import { describe, expect, it } from 'vitest'
import type { CvHeaderResponseDto } from '~/types/cv'
import { buildCvHeaderPatchBody } from '~/composables/useCvHeaderAutosave'

function emptyHeader(): CvHeaderResponseDto {
  return {
    id: 'cv-1',
    user_id: 'user-1',
    is_default_for_profile: true,
    display_title: 'Životopis',
    full_name: null,
    headline: null,
    bio: null,
    phone: null,
    email: null,
    location: null,
    photo_url: null,
    first_name: null,
    last_name: null,
    show_academic_title: false,
    academic_title: null,
    title_before_name: null,
    title_after_name: null,
    birth_date: null,
    show_birth_date: false,
    linkedin_url: null,
    show_contact_details: true,
    address_country: null,
    address_postal_code: null,
    address_district: null,
    address_city: null,
    address_street: null,
    about_me: null,
    cv_title: null,
    visible_to_employers: false,
    driving_license_categories: [],
    approximate_km_driven: null,
    additional_skills_info: null,
    hobbies: null,
    highest_education_level: null,
    gdpr_consent: false,
    terms_consent: false,
    marketing_consent: false,
    template_key: 'modern',
    wizard_step: 'editor',
    wizard_section: 'personal',
    optional_sections: {},
    gender: null,
    birth_day: null,
    birth_month: null,
    birth_year: null,
    address_optional_collapsed: false,
    photo_storage_path: null,
    photo_original_mime: null,
    desired_positions: [],
    desired_locations: [],
    employment_types: [],
    start_availability: null,
    salary_min: null,
    salary_currency: 'EUR',
    salary_period: 'monthly',
    weekend_work: null,
    night_work: null,
    open_to_relocate_commute: null,
    remote_work_only: null,
    has_disability: false,
    email_job_alerts: false,
    pdf_settings: {},
    pdf_generation_status: 'pending',
    pdf_generated_at: null,
    draft_saved_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('buildCvHeaderPatchBody', () => {
  it('includes changed personal fields', () => {
    const baseline = emptyHeader()
    const current = { ...baseline, first_name: 'Ján', last_name: 'Novák' }
    const body = buildCvHeaderPatchBody(current, baseline)
    expect(body).toEqual({
      first_name: 'Ján',
      last_name: 'Novák',
    })
  })

  it('returns empty body when nothing changed', () => {
    const baseline = emptyHeader()
    const body = buildCvHeaderPatchBody(baseline, baseline)
    expect(body).toEqual({})
  })
})
