/** Job catalog URL/canonical helpers — avoid crawl traps from facet query params. */

const CANONICAL_QUERY_KEYS = ['q', 'category', 'location'] as const

const NOINDEX_FACET_KEYS = [
  'sort',
  'urgent_only',
  'date_range',
  'job_type',
  'skills',
  'featured_only',
  'work_mode',
  'salary_type',
  'salary_min',
  'salary_max',
  'min_hourly_wage',
  'max_hourly_wage',
  'radius',
  'page',
  'cursor',
] as const

export type FindCatalogFiltersSnapshot = {
  search: string
  category: string
  location: string
  sort: string
  urgent_only: boolean
  date_range: string
  job_type: string
  skills: string
  featured_only: boolean
  work_mode: string
  salary_type: string
  salary_min: string
  salary_max: string
  min_hourly_wage: string
  max_hourly_wage: string
  radius: string
}

export function buildFindCatalogCanonicalQuery(
  filters: FindCatalogFiltersSnapshot,
): Record<string, string> {
  const q: Record<string, string> = {}
  if (filters.search.trim()) {
    q.q = filters.search.trim()
  }
  if (filters.category !== 'all') {
    q.category = filters.category
  }
  if (filters.location.trim()) {
    q.location = filters.location.trim()
  }
  return q
}

export function findCatalogHasNonCanonicalFacets(filters: FindCatalogFiltersSnapshot): boolean {
  if (filters.urgent_only) return true
  if (filters.date_range !== 'all') return true
  if (filters.job_type !== 'all') return true
  if (filters.skills.trim()) return true
  if (filters.featured_only) return true
  if (filters.work_mode.trim()) return true
  if (filters.salary_type.trim()) return true
  if (filters.salary_min.trim()) return true
  if (filters.salary_max.trim()) return true
  if (filters.min_hourly_wage.trim()) return true
  if (filters.max_hourly_wage.trim()) return true
  if (filters.radius.trim()) return true
  if (filters.sort !== 'relevance') return true
  return false
}

export function buildFindCatalogRouteQuery(
  filters: FindCatalogFiltersSnapshot,
  options: { page?: number; includePaginationKeys?: boolean } = {},
): Record<string, string> {
  const q = buildFindCatalogCanonicalQuery(filters)
  if (options.includePaginationKeys !== false) {
    if (options.page && options.page > 1) {
      q.page = String(options.page)
    }
  }
  return q
}

export function parseFindCatalogPageFromRoute(
  query: Record<string, string | string[] | undefined | null>,
): number {
  const raw = query.page
  const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : 1
  if (!Number.isFinite(value) || value < 1) {
    return 1
  }
  return Math.min(value, 500)
}

export { CANONICAL_QUERY_KEYS, NOINDEX_FACET_KEYS }
