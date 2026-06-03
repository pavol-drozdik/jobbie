import type { Job } from '~/utils/job'

export type PublicJobCatalogResult = {
  items: Job[]
  next_cursor: string | null
  has_more: boolean
}

type SearchJobsResponse = {
  entity: 'jobs'
  items: Job[]
  next_cursor?: string
  has_more?: boolean
}

/** SSR-safe first page of job catalog (public search API). */
export async function fetchPublicJobCatalog(params: {
  isForeign: boolean
  limit?: number
  q?: string
  category?: string
  page?: number
}): Promise<PublicJobCatalogResult | null> {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!base) return null
  const query: Record<string, string> = {
    entity: 'jobs',
    limit: String(params.limit ?? 24),
    include_facets: 'false',
    sort: 'relevance',
    is_foreign: params.isForeign ? 'true' : 'false',
  }
  if (params.page && params.page > 1) {
    query.page = String(params.page)
  }
  if (params.q?.trim()) {
    query.q = params.q.trim()
  }
  if (params.category?.trim() && params.category !== 'all') {
    query.category = params.category.trim()
  }
  try {
    const res = await $fetch<SearchJobsResponse>(`${base}/api/search`, { query })
    if (!Array.isArray(res?.items)) return null
    return {
      items: res.items,
      next_cursor: res.next_cursor ?? null,
      has_more: Boolean(res.has_more),
    }
  } catch {
    return null
  }
}
