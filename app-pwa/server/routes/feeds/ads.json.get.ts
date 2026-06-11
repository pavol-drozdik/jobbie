import { buildSeoFeedJson, setFeedCacheHeaders } from '../../utils/seo-feed-response'

export default defineEventHandler(async (event) => {
  setFeedCacheHeaders(event)
  setHeader(event, 'content-type', 'application/feed+json; charset=utf-8')
  return buildSeoFeedJson(event, 'ads')
})
