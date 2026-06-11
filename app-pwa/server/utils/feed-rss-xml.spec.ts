import { describe, expect, it } from 'vitest'
import { buildRssXml, toRfc822Date } from './feed-rss-xml'

describe('feed-rss-xml', () => {
  it('escapes XML and builds channel', () => {
    const xml = buildRssXml({
      title: 'Test & Co',
      link: 'https://jobbie.sk/feeds/jobs.rss',
      description: 'Jobs <feed>',
      items: [
        {
          guid: 'https://jobbie.sk/ponuka/1',
          link: 'https://jobbie.sk/ponuka/1',
          title: 'Kosenie',
          description: 'Brigáda',
          pubDate: toRfc822Date('2026-06-01T10:00:00.000Z'),
        },
      ],
    })
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;feed&gt;')
    expect(xml).toContain('<item>')
  })
})
