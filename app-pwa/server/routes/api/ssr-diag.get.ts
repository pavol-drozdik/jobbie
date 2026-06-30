/**
 * SSR diagnostics — temporary debugging endpoint.
 * Remove after the production 500 issue is resolved.
 *
 * Usage: /api/ssr-diag?slug=your-blog-slug
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = String(config.public.apiBaseUrl ?? '')
  const querySlug = String(getQuery(event).slug ?? '')

  async function probe(url: string): Promise<{
    status: number
    bodyPreview: unknown
    error: string | null
  }> {
    try {
      const raw = await $fetch.raw<unknown>(url, {
        timeout: 8000,
        ignoreResponseError: true,
        headers: { Accept: 'application/json' },
      })
      const body = raw._data
      let bodyPreview: unknown
      if (Array.isArray(body)) {
        bodyPreview = { type: 'array', length: body.length, first: body[0] }
      } else if (body && typeof body === 'object') {
        bodyPreview = body
      } else {
        bodyPreview = String(body ?? '').slice(0, 200)
      }
      return { status: raw.status, bodyPreview, error: null }
    } catch (e: unknown) {
      const err = e as { statusCode?: number; status?: number; message?: string }
      return {
        status: err.statusCode ?? err.status ?? 0,
        bodyPreview: null,
        error: err.message ?? String(e),
      }
    }
  }

  const [listResult, postResult] = await Promise.all([
    probe(`${apiBase}/api/blog`),
    querySlug ? probe(`${apiBase}/api/blog/${encodeURIComponent(querySlug)}`) : Promise.resolve(null),
  ])

  return {
    runtime: {
      apiBaseUrl: apiBase,
      siteUrl: String(config.public.siteUrl ?? ''),
      allowIndexing: String(config.public.allowIndexing ?? ''),
    },
    blogList: listResult,
    blogPost: querySlug ? { slug: querySlug, ...postResult } : '(pass ?slug=your-slug to test)',
    workerTimestamp: new Date().toISOString(),
  }
})
