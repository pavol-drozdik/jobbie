import { describe, expect, it } from 'vitest'

import type { Job } from '~/utils/job'
import type { BlogPostDetail } from '~/composables/useBlog'
import type { CompanyAd } from '~/utils/company-ad'
import {
  buildBlogAeoFacts,
  buildBlogPostDetailSeoMeta,
  buildJobAeoFacts,
  buildJobDetailJsonLd,
  buildJobDetailSeoMeta,
  buildProfessionalAdDetailSeoMeta,
  isCompanyAdPublicIndexable,
  isJobPublicIndexable,
} from '~/utils/public-content-seo'

describe('public content SEO meta', () => {
  it('builds job meta from title and stripped description', () => {
    const job = {
      id: 'j1',
      title: 'Brigáda v sklade',
      description: '<p>Pomoc pri <strong>balení</strong></p>',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      is_active: true,
      is_draft: false,
      is_deleted: false,
    } as Job
    const meta = buildJobDetailSeoMeta(job)
    expect(meta.title).toBe('Brigáda v sklade')
    expect(meta.description).not.toContain('<p>')
    expect(meta.canonicalPath).toBe('/ponuka/j1')
    expect(meta.dateModified).toBe('2026-02-01T00:00:00Z')
    expect(meta.noindex).toBe(false)
  })

  it('prefers blog seo fields when present', () => {
    const post = {
      slug: 'tipy',
      title: 'Tipy',
      seo_title: 'SEO titulok',
      seo_description: 'SEO popis',
      excerpt: 'Excerpt',
      body_html: '<p>Body</p>',
      published_at: '2026-03-01T00:00:00Z',
      category: 'guides',
    } as BlogPostDetail
    const meta = buildBlogPostDetailSeoMeta(post)
    expect(meta.title).toBe('SEO titulok')
    expect(meta.description).toBe('SEO popis')
    expect(meta.ogType).toBe('article')
    expect(meta.canonicalPath).toBe('/blog/tipy')
  })

  it('builds professional ad meta from tagline or body', () => {
    const ad = {
      id: 'a1',
      title: 'Elektrikár',
      tagline: 'Rýchla pomoc 24/7',
      body: '<p>Kompletné elektroinštalácie</p>',
      status: 'active',
      updated_at: '2026-04-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    } as CompanyAd
    const meta = buildProfessionalAdDetailSeoMeta(ad)
    expect(meta.description).toContain('Rýchla pomoc')
    expect(meta.canonicalPath).toBe('/profesionali/a1')
    expect(meta.noindex).toBe(false)
  })

  it('marks draft jobs as noindex and omits JobPosting schema', () => {
    const job = {
      id: 'j2',
      title: 'Draft',
      is_active: false,
      is_draft: true,
      is_deleted: false,
      description: 'x',
      created_at: '2026-01-01T00:00:00Z',
    } as Job
    expect(isJobPublicIndexable(job)).toBe(false)
    expect(buildJobDetailSeoMeta(job).noindex).toBe(true)
    expect(buildJobDetailJsonLd(job, 'https://example.test', [])).toHaveLength(0)
  })

  it('builds extractable job AEO facts', () => {
    const job = {
      id: 'j3',
      title: 'Skladník',
      description: 'Popis',
      category: 'warehouse',
      job_type: 'part_time',
      employer_name: 'Firma s.r.o.',
      is_active: true,
      is_draft: false,
      is_deleted: false,
      location: 'Bratislava',
      created_at: '2026-01-01T00:00:00Z',
    } as Job
    const facts = buildJobAeoFacts(job)
    expect(facts.some((f) => f.label === 'Ako sa prihlásiť')).toBe(true)
    expect(facts.some((f) => f.value.includes('Bratislava'))).toBe(true)
  })

  it('builds blog AEO facts with author when present', () => {
    const post = {
      slug: 'x',
      title: 'T',
      body_html: '<p>Obsah</p>',
      published_at: '2026-03-01T00:00:00Z',
      category: 'guides',
      author_name: 'Anna',
      author_role: 'Editor',
    } as BlogPostDetail
    const facts = buildBlogAeoFacts(post)
    expect(facts.some((f) => f.label === 'Autor' && f.value.includes('Anna'))).toBe(true)
  })

  it('marks non-active company ads as noindex', () => {
    const ad = {
      id: 'a2',
      title: 'Draft ad',
      status: 'draft',
      body: 'Text',
      created_at: '2026-01-01T00:00:00Z',
    } as CompanyAd
    expect(isCompanyAdPublicIndexable(ad)).toBe(false)
    expect(buildProfessionalAdDetailSeoMeta(ad).noindex).toBe(true)
  })
})
