export type JsonFeedItem = {
  id: string
  url: string
  title: string
  summary: string
  date_published: string
  date_modified?: string | null
  image?: string | null
}

export type JsonFeedDocument = {
  version: string
  title: string
  home_page_url: string
  feed_url: string
  description: string
  language: string
  items: JsonFeedItem[]
}

export function buildJsonFeed(doc: JsonFeedDocument): string {
  return `${JSON.stringify(doc, null, 0)}\n`
}
