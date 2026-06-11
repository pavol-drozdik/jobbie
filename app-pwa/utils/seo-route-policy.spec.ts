import { describe, expect, it } from 'vitest'

import {
  SEO_LEGAL_PATHS,
  getSeoRoutePolicy,
  getSeoSitemapStaticPaths,
  pathShouldNoindex,
} from '~/utils/seo-route-policy'

describe('seo-route-policy', () => {
  it('keeps legal pages noindex until published', () => {
    for (const path of SEO_LEGAL_PATHS) {
      expect(pathShouldNoindex(path, false)).toBe(true)
      expect(pathShouldNoindex(path, true)).toBe(false)
    }
  })

  it('excludes unpublished legal pages from sitemap', () => {
    expect(getSeoSitemapStaticPaths(false)).not.toContain('/vseobecne-podmienky')
    expect(getSeoSitemapStaticPaths(true)).toContain('/bezpecnost')
  })

  it('marks private app routes as noindex', () => {
    expect(getSeoRoutePolicy('/nastavenia').indexable).toBe(false)
    expect(getSeoRoutePolicy('/chat/room-1').indexable).toBe(false)
  })

  it('does not include removed guide routes in sitemap', () => {
    expect(getSeoSitemapStaticPaths(false)).not.toContain('/navody/ako-to-funguje')
  })
})
