export type RssFeedItem = {
  guid: string
  link: string
  title: string
  description: string
  pubDate: string
  enclosureUrl?: string | null
}

export type RssFeedChannel = {
  title: string
  link: string
  description: string
  language?: string
  lastBuildDate?: string
  items: RssFeedItem[]
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function toRfc822Date(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toUTCString()
  return d.toUTCString()
}

export function buildRssXml(channel: RssFeedChannel): string {
  const itemsXml = channel.items
    .map((item) => {
      const enclosure =
        item.enclosureUrl?.trim()
          ? `\n      <enclosure url="${escapeXml(item.enclosureUrl)}" type="image/jpeg" />`
          : ''
      return `    <item>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <link>${escapeXml(item.link)}</link>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>${enclosure}
    </item>`
    })
    .join('\n')
  const lastBuild = channel.lastBuildDate
    ? `\n    <lastBuildDate>${escapeXml(channel.lastBuildDate)}</lastBuildDate>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language ?? 'sk')}</language>${lastBuild}
    <atom:link href="${escapeXml(channel.link)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`
}
