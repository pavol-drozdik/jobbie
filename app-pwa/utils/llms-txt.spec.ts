import { describe, expect, it } from 'vitest'
import { buildLlmsTxt } from './llms-txt'

describe('buildLlmsTxt', () => {
  it('includes Slovak sections and feed URLs', () => {
    const text = buildLlmsTxt({ siteUrl: 'https://jobbie.sk', brandName: 'JOBBIE' })
    expect(text).toContain('# JOBBIE')
    expect(text).toContain('kosenie trávy')
    expect(text).toContain('https://jobbie.sk/feeds/jobs.rss')
    expect(text).toContain('https://jobbie.sk/sitemap.xml')
    expect(text).toContain('https://jobbie.sk/pracovne-ponuky')
  })
})
