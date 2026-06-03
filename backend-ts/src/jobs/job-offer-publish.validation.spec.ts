import { BadRequestException } from '@nestjs/common'
import {
  validateJobForPublish,
  sanitizeRequiredDocuments,
} from './job-offer-publish.validation'

describe('validateJobForPublish', () => {
  const valid = {
    title: 'Test job',
    description: 'Popis',
    category: 'ine',
    job_type: 'tpp',
    employment_types: ['full_time'],
    work_modes: ['on_site'],
    city: 'Bratislava',
    location_address: 'Hlavná 1',
    salary_type: 'monthly',
    salary_min: 1200,
    application_method: 'platform',
  }

  it('skips validation for drafts', () => {
    expect(() => validateJobForPublish({}, { isDraft: true })).not.toThrow()
  })

  it('rejects unknown category slug on publish', () => {
    expect(() =>
      validateJobForPublish({ ...valid, category: 'invalid' }, { isDraft: false }),
    ).toThrow(BadRequestException)
  })

  it('requires title on publish', () => {
    expect(() =>
      validateJobForPublish({ ...valid, title: '' }, { isDraft: false }),
    ).toThrow(BadRequestException)
  })

  it('allows remote-only without city', () => {
    expect(() =>
      validateJobForPublish(
        {
          ...valid,
          work_modes: ['remote'],
          city: null,
          location_address: null,
        },
        { isDraft: false },
      ),
    ).not.toThrow()
  })

  it('rejects salary max below min', () => {
    expect(() =>
      validateJobForPublish(
        { ...valid, salary_min: 2000, salary_max: 1000 },
        { isDraft: false },
      ),
    ).toThrow(BadRequestException)
  })

  it('requires email when application method is email', () => {
    expect(() =>
      validateJobForPublish(
        {
          ...valid,
          application_method: 'email',
          contact_email: '',
        },
        { isDraft: false },
      ),
    ).toThrow(BadRequestException)
  })
})

describe('sanitizeRequiredDocuments', () => {
  it('keeps only none when none selected', () => {
    expect(sanitizeRequiredDocuments(['cv', 'none'])).toEqual(['none'])
  })
})
