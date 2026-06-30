/**
 * SSR diagnostics — temporary debugging endpoint.
 * Visit /api/ssr-diag on production to see what the CF Worker sees at runtime.
 * Remove after the production 500 issue is resolved.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = String(config.public.apiBaseUrl ?? '')

  // Step 1: fetch blog list with GET to grab a real slug
  let listStatus: number = 0
  let listError = ''
  let firstSlug = ''
  let listShape: unknown = null
  try {
    const list = await $fetch<unknown>(
      `${apiBase}/api/blog`,
      { timeout: 6000, ignoreResponseError: true },
    )
    listStatus = 200
    // Expose top-level shape so we can see the real structure
    if (Array.isArray(list)) {
      listShape = { type: 'array', length: list.length, firstItemKeys: Object.keys((list[0] as Record<string, unknown>) ?? {}) }
      firstSlug = (list[0] as { slug?: string })?.slug ?? ''
    } else if (list && typeof list === 'object') {
      listShape = { type: 'object', keys: Object.keys(list as Record<string, unknown>) }
      const obj = list as Record<string, unknown>
      // try common shapes
      if (Array.isArray(obj.data)) {
        firstSlug = (obj.data[0] as { slug?: string })?.slug ?? ''
      } else if (Array.isArray(obj.items)) {
        firstSlug = (obj.items[0] as { slug?: string })?.slug ?? ''
      } else if (Array.isArray(obj.posts)) {
        firstSlug = (obj.posts[0] as { slug?: string })?.slug ?? ''
      } else if (Array.isArray(obj.results)) {
        firstSlug = (obj.results[0] as { slug?: string })?.slug ?? ''
      } else if (typeof obj.slug === 'string') {
        firstSlug = obj.slug
      }
    }
  } catch (e: unknown) {
    const err = e as { statusCode?: number; status?: number; message?: string }
    listStatus = err.statusCode ?? err.status ?? 0
    listError = err.message ?? String(e)
  }

  // Step 2: fetch a specific blog post (slug from query or from list)
  const querySlug = String(getQuery(event).slug ?? firstSlug ?? '')
  let postStatus: number = 0
  let postError = ''
  let postDataKeys: string[] = []
  if (querySlug) {
    try {
      const post = await $fetch<Record<string, unknown>>(
        `${apiBase}/api/blog/${encodeURIComponent(querySlug)}`,
        { timeout: 6000, ignoreResponseError: true },
      )
      postStatus = 200
      postDataKeys = Object.keys(post ?? {})
    } catch (e: unknown) {
      const err = e as { statusCode?: number; status?: number; message?: string }
      postStatus = err.statusCode ?? err.status ?? 0
      postError = err.message ?? String(e)
    }
  }

  return {
    runtime: {
      apiBaseUrl: apiBase,
      siteUrl: String(config.public.siteUrl ?? ''),
      allowIndexing: String(config.public.allowIndexing ?? ''),
    },
    blogList: {
      status: listStatus,
      error: listError || null,
      shape: listShape,
      firstSlugFound: firstSlug || null,
    },
    blogPost: querySlug
      ? {
          slug: querySlug,
          status: postStatus,
          error: postError || null,
          dataKeys: postDataKeys,
        }
      : null,
    workerTimestamp: new Date().toISOString(),
  }
})
