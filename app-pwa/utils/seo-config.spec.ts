import { describe, expect, it } from 'vitest'

import {
  getSeoRoutePolicy,
  pathShouldNoindex,
  SEO_SITEMAP_STATIC_PATHS,
} from '~/utils/seo-route-policy'
import { normalizeSiteUrl, parseAllowIndexing, formatBrandedSeoTitle, SEO_DEFAULT_TITLE } from '~/utils/seo-config'
import {
  buildFindCatalogCanonicalQuery,
  findCatalogHasNonCanonicalFacets,
} from '~/utils/find-catalog-seo'

describe('parseAllowIndexing', () => {
  it('defaults to false', () => {
    expect(parseAllowIndexing(undefined)).toBe(false)
    expect(parseAllowIndexing('')).toBe(false)
    expect(parseAllowIndexing('0')).toBe(false)
  })

  it('accepts truthy values', () => {
    expect(parseAllowIndexing('1')).toBe(true)
    expect(parseAllowIndexing('true')).toBe(true)
    expect(parseAllowIndexing('yes')).toBe(true)
  })
})

describe('normalizeSiteUrl', () => {
  it('strips trailing slash and adds scheme', () => {
    expect(normalizeSiteUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeSiteUrl('example.com')).toBe('https://example.com')
  })
})

describe('formatBrandedSeoTitle', () => {
  it('appends brand suffix once', () => {
    expect(formatBrandedSeoTitle('Blog')).toBe('Blog — JOBBIE')
    expect(formatBrandedSeoTitle('Jan Novák | Profil')).toBe('Jan Novák | Profil — JOBBIE')
  })

  it('falls back to default page title when empty', () => {
    expect(formatBrandedSeoTitle('')).toBe(`${SEO_DEFAULT_TITLE} — JOBBIE`)
    expect(formatBrandedSeoTitle('   ')).toBe(`${SEO_DEFAULT_TITLE} — JOBBIE`)
  })
})

describe('seo route policy', () => {
  it('keeps databaza-zivotopisov noindex', () => {
    expect(pathShouldNoindex('/databaza-zivotopisov')).toBe(true)
  })

  it('allows public job detail', () => {
    expect(getSeoRoutePolicy('/ponuka/abc-123').indexable).toBe(true)
  })

  it('blocks auth and settings', () => {
    expect(pathShouldNoindex('/auth/login')).toBe(true)
    expect(pathShouldNoindex('/nastavenia/profil')).toBe(true)
  })

  it('excludes ponuky-na-email subroutes from sitemap static list', () => {
    expect(SEO_SITEMAP_STATIC_PATHS).toContain('/ponuky-na-email')
    expect(SEO_SITEMAP_STATIC_PATHS).not.toContain('/databaza-zivotopisov')
  })
})

describe('find catalog canonical', () => {
  const base = {
    search: '',
    category: 'all',
    location: '',
    sort: 'relevance',
    urgent_only: false,
    date_range: 'all',
    job_type: 'all',
    skills: '',
    featured_only: false,
    work_mode: '',
    salary_type: '',
    salary_min: '',
    salary_max: '',
    min_hourly_wage: '',
    max_hourly_wage: '',
    radius: '',
  }

  it('whitelists primary filters only', () => {
    const q = buildFindCatalogCanonicalQuery({
      ...base,
      search: 'brigáda',
      category: 'retail',
    })
    expect(q).toEqual({ q: 'brigáda', category: 'retail' })
    expect(q.page).toBeUndefined()
    expect(q.sort).toBeUndefined()
  })

  it('detects non-canonical facets', () => {
    expect(findCatalogHasNonCanonicalFacets({ ...base, sort: 'created_at' })).toBe(true)
    expect(findCatalogHasNonCanonicalFacets(base)).toBe(false)
  })
})
