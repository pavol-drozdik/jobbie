import { describe, expect, it } from 'vitest'

import { buildSitemapXml, toIsoDate } from './sitemap-xml'

describe('buildSitemapXml', () => {
  it('escapes special characters in URLs', () => {
    const xml = buildSitemapXml([
      { loc: 'https://example.com/a?x=1&y=2' },
      { loc: 'https://example.com/"test"' },
    ])
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&quot;test&quot;')
    expect(xml).toContain('<urlset')
  })

  it('formats lastmod as ISO date', () => {
    expect(toIsoDate('2026-06-01T12:00:00Z')).toBe('2026-06-01')
    expect(toIsoDate(null)).toBeUndefined()
  })
})
