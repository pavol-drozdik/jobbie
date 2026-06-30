/**
 * SSR diagnostics — temporary debugging endpoint.
 * Remove after the production 500 issue is resolved.
 *
 * Usage: /api/ssr-diag?job_id=xxx&ad_id=yyy&slug=zzz
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = String(config.public.apiBaseUrl ?? '').replace(/\/+$/, '')
  const query = getQuery(event)
  const jobId = String(query.job_id ?? '')
  const adId = String(query.ad_id ?? '')
  const querySlug = String(query.slug ?? '')

  async function probeRaw(url: string): Promise<{
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
      const err = e as { statusCode?: number; status?: number; message?: string; stack?: string }
      return {
        status: err.statusCode ?? err.status ?? 0,
        bodyPreview: null,
        error: `${err.message ?? String(e)} | stack: ${(err.stack ?? '').split('\n').slice(0, 4).join(' > ')}`,
      }
    }
  }

  async function probeFetch(url: string): Promise<{
    result: unknown
    error: string | null
  }> {
    try {
      const result = await $fetch<unknown>(url, { timeout: 8000 })
      return {
        result: result && typeof result === 'object' ? { type: 'object', keys: Object.keys(result as object).slice(0, 10) } : result,
        error: null,
      }
    } catch (e: unknown) {
      const err = e as { statusCode?: number; status?: number; message?: string; stack?: string }
      return {
        result: null,
        error: `status=${err.statusCode ?? err.status ?? 0} message=${err.message ?? String(e)} | stack: ${(err.stack ?? '').split('\n').slice(0, 4).join(' > ')}`,
      }
    }
  }

  const [
    jobRaw,
    jobFetch,
    adRaw,
    adFetch,
    similarRaw,
  ] = await Promise.all([
    jobId ? probeRaw(`${apiBase}/api/jobs/${encodeURIComponent(jobId)}`) : Promise.resolve(null),
    jobId ? probeFetch(`${apiBase}/api/jobs/${encodeURIComponent(jobId)}`) : Promise.resolve(null),
    adId ? probeRaw(`${apiBase}/api/company-ads/${encodeURIComponent(adId)}`) : Promise.resolve(null),
    adId ? probeFetch(`${apiBase}/api/company-ads/${encodeURIComponent(adId)}`) : Promise.resolve(null),
    jobId ? probeRaw(`${apiBase}/api/jobs/${encodeURIComponent(jobId)}/similar?limit=6`) : Promise.resolve(null),
  ])

  const blogResult = querySlug ? await probeRaw(`${apiBase}/api/blog/${encodeURIComponent(querySlug)}`) : null

  // Test if page components are importable from within the Worker bundle.
  // A missing or broken component export = "Couldn't resolve component" 500.
  async function probePageComponent(label: string, importFn: () => Promise<unknown>): Promise<{
    hasDefault: boolean; keys: string[]; error: string | null
  }> {
    try {
      const mod = await importFn() as Record<string, unknown>
      return { hasDefault: 'default' in mod, keys: Object.keys(mod).slice(0, 10), error: null }
    } catch (e: unknown) {
      const err = e as Error
      return { hasDefault: false, keys: [], error: `${label}: ${err?.message ?? String(e)}` }
    }
  }

  const [ponukaPage, profesionaliPage, blogPage] = await Promise.all([
    probePageComponent('ponuka', () => import('../../../pages/ponuka/[id].vue')),
    probePageComponent('profesionali', () => import('../../../pages/profesionali/[id].vue')),
    probePageComponent('blog', () => import('../../../pages/blog/[slug].vue')),
  ])

  return {
    runtime: {
      apiBaseUrl: apiBase,
      siteUrl: String(config.public.siteUrl ?? ''),
      allowIndexing: String(config.public.allowIndexing ?? ''),
    },
    pageComponents: { ponuka: ponukaPage, profesionali: profesionaliPage, blog: blogPage },
    job: jobId ? {
      id: jobId,
      raw: jobRaw,
      fetch: jobFetch,
      similar: similarRaw,
    } : '(pass ?job_id= to test)',
    companyAd: adId ? {
      id: adId,
      raw: adRaw,
      fetch: adFetch,
    } : '(pass ?ad_id= to test)',
    blog: querySlug ? { slug: querySlug, raw: blogResult } : '(pass ?slug= to test)',
    workerTimestamp: new Date().toISOString(),
  }
})
