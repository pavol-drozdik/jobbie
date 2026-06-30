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
  try {
    const list = await $fetch<{ slug?: string; items?: { slug: string }[] }>(
      `${apiBase}/api/blog`,
      { timeout: 6000, ignoreResponseError: true },
    )
    listStatus = 200
    // handle common list response shapes
    if (Array.isArray(list)) {
      firstSlug = (list[0] as { slug?: string })?.slug ?? ''
    } else if (Array.isArray((list as { items?: { slug: string }[] }).items)) {
      firstSlug = (list as { items: { slug: string }[] }).items[0]?.slug ?? ''
    } else if ((list as { slug?: string }).slug) {
      firstSlug = (list as { slug: string }).slug
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
