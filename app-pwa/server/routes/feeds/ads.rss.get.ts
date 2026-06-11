import { buildSeoFeedRss, setFeedCacheHeaders } from '../../utils/seo-feed-response'

export default defineEventHandler(async (event) => {
  setFeedCacheHeaders(event)
  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return buildSeoFeedRss(event, 'ads')
})
