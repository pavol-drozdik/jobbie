import { describe, expect, it } from 'vitest'

import type { Job } from '~/utils/job'
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildJobPostingJsonLd,
} from '~/utils/seo-json-ld'

describe('buildJobPostingJsonLd', () => {
  const siteUrl = 'https://example.test'

  it('omits baseSalary when no compensation is set', () => {
    const job = {
      id: 'job-1',
      title: 'Pokladník',
      description: '<p>Pomoc v obchode</p>',
      created_at: '2026-01-01T00:00:00Z',
      employer_name: 'Test s.r.o.',
    } as Job
    const ld = buildJobPostingJsonLd(job, siteUrl)
    expect(ld['@type']).toBe('JobPosting')
    expect(ld.baseSalary).toBeUndefined()
    expect(String(ld.description)).not.toContain('<p>')
  })

  it('includes salary when visible on job', () => {
    const job = {
      id: 'job-2',
      title: 'Brigáda',
      description: 'Popis',
      created_at: '2026-01-01T00:00:00Z',
      compensation_amount: 6.5,
      compensation_type: 'hourly',
      salary_type: 'hourly',
    } as Job
    const ld = buildJobPostingJsonLd(job, siteUrl)
    expect(ld.baseSalary).toBeDefined()
  })

  it('includes identifier and application contact', () => {
    const job = {
      id: 'job-3',
      title: 'Kosenie',
      description: 'Popis',
      created_at: '2026-01-01T00:00:00Z',
      application_url: 'https://example.test/apply',
    } as Job
    const ld = buildJobPostingJsonLd(job, siteUrl)
    expect(ld.identifier).toMatchObject({ value: 'job-3' })
    expect(ld.directApply).toBe(true)
    expect(ld.applicationContact).toMatchObject({ url: 'https://example.test/apply' })
  })
})

describe('buildFaqPageJsonLd', () => {
  it('maps questions to FAQPage entities', () => {
    const ld = buildFaqPageJsonLd([
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
    ])
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(2)
  })
})

describe('buildBreadcrumbListJsonLd', () => {
  it('assigns sequential positions', () => {
    const ld = buildBreadcrumbListJsonLd(
      [
        { label: 'Domov', to: '/' },
        { label: 'Blog', to: '/blog' },
        { label: 'Článok' },
      ],
      'https://example.test',
    )
    expect(ld.itemListElement[0].position).toBe(1)
    expect(ld.itemListElement[2].item).toBeUndefined()
  })
})
