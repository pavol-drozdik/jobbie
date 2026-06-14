import { createError, getQuery, setHeader, setResponseStatus } from 'h3'
import {
  isAllowedMediaProxyUrl,
  MEDIA_PROXY_CACHE_CONTROL,
} from '../utils/media-proxy'

type CfFetchInit = RequestInit & {
  cf?: { cacheEverything?: boolean; cacheTtl?: number }
}

export default defineEventHandler(async (event) => {
  const method = event.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const url = String(getQuery(event).url ?? '').trim()
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' })
  }
  if (!isAllowedMediaProxyUrl(url)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const upstream = await fetch(url, {
    method,
    cf: { cacheEverything: true, cacheTtl: 31_536_000 },
  } as CfFetchInit)

  if (!upstream.ok) {
    throw createError({
      statusCode: upstream.status,
      statusMessage: 'Upstream error',
    })
  }

  setHeader(event, 'Cache-Control', MEDIA_PROXY_CACHE_CONTROL)
  const contentType = upstream.headers.get('content-type')
  if (contentType) {
    setHeader(event, 'content-type', contentType)
  }
  const contentLength = upstream.headers.get('content-length')
  if (contentLength) {
    setHeader(event, 'content-length', contentLength)
  }

  if (method === 'HEAD') {
    setResponseStatus(event, upstream.status)
    return null
  }

  return upstream.arrayBuffer()
})
