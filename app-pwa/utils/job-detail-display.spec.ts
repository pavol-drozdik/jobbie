import { describe, expect, it } from 'vitest'
import type { Job } from '~/utils/job'
import {
  buildJobApplicationDetail,
  buildJobBenefitLabels,
  buildJobScheduleItems,
  parseJobRequirementsMeta,
} from '~/utils/job-detail-display'
import { S } from '~/utils/strings'

function baseJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    company_id: 'co-1',
    title: 'Test',
    description: 'Desc',
    location: 'Bratislava, BA',
    location_address: null,
    location_lat: null,
    location_lng: null,
    contract_type: null,
    requirements: null,
    salary: null,
    job_type: 'brigada',
    expires_at: null,
    is_draft: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    category: 'ine',
    is_urgent: false,
    is_featured: false,
    compensation_type: null,
    compensation_amount: null,
    workers_needed: 1,
    application_deadline: null,
    completion_deadline: null,
    employer_email: null,
    employer_name: 'Firma',
    photos: [],
    applications_count: 0,
    employment_types: ['brigada'],
    ...overrides,
  }
}

describe('parseJobRequirementsMeta', () => {
  it('parses valid requirements JSON', () => {
    const meta = parseJobRequirementsMeta(
      JSON.stringify({
        v: 1,
        job_kind: 'brigada',
        brigada: { asap: true, od: '2026-06-01', do: '2026-08-31' },
      }),
    )
    expect(meta?.job_kind).toBe('brigada')
    expect(meta?.brigada?.asap).toBe(true)
  })

  it('returns null for invalid JSON', () => {
    expect(parseJobRequirementsMeta('{bad')).toBeNull()
    expect(parseJobRequirementsMeta(null)).toBeNull()
  })

  it('accepts requirements already parsed as object', () => {
    const meta = parseJobRequirementsMeta({
      v: 1,
      job_kind: 'brigada',
      brigada: { asap: true },
    })
    expect(meta?.brigada?.asap).toBe(true)
  })
})

describe('buildJobScheduleItems', () => {
  it('shows nástup ASAP and brigáda obdobie', () => {
    const job = baseJob({
      requirements: JSON.stringify({
        v: 1,
        job_kind: 'brigada',
        brigada: {
          asap: true,
          od: '2026-06-01',
          do: '2026-08-31',
        },
      }),
    })
    const items = buildJobScheduleItems(job)
    expect(
      items.some(
        (i) =>
          i.label === S.jobDetailScheduleNastup &&
          i.value === S.jobAlertsStartAsap,
      ),
    ).toBe(true)
    expect(items.some((i) => i.label === S.jobDetailScheduleBrigadaPeriod)).toBe(
      true,
    )
  })

  it('shows turnus obdobie for turnus employment', () => {
    const job = baseJob({
      job_type: 'tpp',
      employment_types: ['turnus'],
      requirements: JSON.stringify({
        v: 1,
        job_kind: 'tpp',
        turnus: { od: '2026-07-01', do: '2026-07-14' },
      }),
    })
    const items = buildJobScheduleItems(job)
    expect(items.some((i) => i.label === S.jobDetailScheduleTurnusPeriod)).toBe(
      true,
    )
  })

  it('shows fuška nezáleží', () => {
    const job = baseJob({
      job_type: 'fuska',
      employment_types: ['one_off'],
      requirements: JSON.stringify({
        v: 1,
        job_kind: 'fuska',
        fuska: { nezalezi: true },
      }),
    })
    const items = buildJobScheduleItems(job)
    expect(
      items.some(
        (i) =>
          i.label === S.jobDetailScheduleFuskaPeriod &&
          i.value === S.jobDetailScheduleFuskaAnytime,
      ),
    ).toBe(true)
  })
})

describe('buildJobBenefitLabels', () => {
  it('maps benefit ids to labels', () => {
    const labels = buildJobBenefitLabels(baseJob({ benefits: [1] }))
    expect(labels.length).toBe(1)
    expect(labels[0]).not.toMatch(/^#/)
  })
})

describe('buildJobApplicationDetail', () => {
  it('filters none from required documents', () => {
    const detail = buildJobApplicationDetail(
      baseJob({
        application_method: 'platform',
        required_documents: ['none'],
      }),
    )
    expect(detail.requiredDocuments).toEqual([])
  })
})
