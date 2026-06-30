/**
 * SSR diagnostics — temporary debugging endpoint.
 * Visit /api/ssr-diag on production to see what the CF Worker sees at runtime.
 * Remove after the production 500 issue is resolved.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = String(config.public.apiBaseUrl ?? '')
  const testUrl = `${apiBase}/api/blog`

  let apiStatus: number | string = 0
  let apiError = ''
  try {
    const resp = await $fetch.raw(testUrl, {
      method: 'HEAD',
      timeout: 6000,
      ignoreResponseError: true,
    })
    apiStatus = resp.status
  } catch (e: unknown) {
    const err = e as { statusCode?: number; status?: number; message?: string }
    apiStatus = err.statusCode ?? err.status ?? 0
    apiError = err.message ?? String(e)
  }

  return {
    runtime: {
      apiBaseUrl: apiBase,
      siteUrl: String(config.public.siteUrl ?? ''),
      allowIndexing: String(config.public.allowIndexing ?? ''),
    },
    apiConnectivity: {
      testedUrl: testUrl,
      httpStatus: apiStatus,
      error: apiError || null,
    },
    workerTimestamp: new Date().toISOString(),
  }
})
