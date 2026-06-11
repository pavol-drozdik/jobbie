import { describe, expect, it } from 'vitest'
import { buildJsonFeed } from './feed-json'

describe('buildJsonFeed', () => {
  it('serializes JSON Feed 1.1 document', () => {
    const json = buildJsonFeed({
      version: 'https://jsonfeed.org/version/1.1',
      title: 'JOBBIE',
      home_page_url: 'https://jobbie.sk',
      feed_url: 'https://jobbie.sk/feeds/jobs.json',
      description: 'Ponuky',
      language: 'sk',
      items: [],
    })
    expect(JSON.parse(json)).toMatchObject({ version: 'https://jsonfeed.org/version/1.1' })
  })
})
