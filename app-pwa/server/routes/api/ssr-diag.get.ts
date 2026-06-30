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

  const query = getQuery(event)
  const jobId = String(query.job_id ?? '')
  const adId = String(query.ad_id ?? '')

  const [blogResult, jobResult, adResult] = await Promise.all([
    probe(`${apiBase}/api/blog/${encodeURIComponent(querySlug)}`),
    jobId ? probe(`${apiBase}/api/jobs/${encodeURIComponent(jobId)}`) : Promise.resolve(null),
    adId ? probe(`${apiBase}/api/company-ads/${encodeURIComponent(adId)}`) : Promise.resolve(null),
  ])

  return {
    runtime: {
      apiBaseUrl: apiBase,
      siteUrl: String(config.public.siteUrl ?? ''),
      allowIndexing: String(config.public.allowIndexing ?? ''),
    },
    blog: querySlug ? { slug: querySlug, ...blogResult } : '(pass ?slug= to test)',
    job: jobId ? { id: jobId, ...jobResult } : '(pass ?job_id= to test)',
    companyAd: adId ? { id: adId, ...adResult } : '(pass ?ad_id= to test)',
    workerTimestamp: new Date().toISOString(),
  }
})
