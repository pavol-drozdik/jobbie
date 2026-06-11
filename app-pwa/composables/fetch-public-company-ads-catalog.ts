import type { CompanyAdListItem } from '~/utils/company-ad'

export type PublicCompanyAdsCatalogParams = {
  limit?: number
  offset?: number
  q?: string
  category?: string
  location?: string
}

export async function fetchPublicCompanyAdsCatalog(
  params: PublicCompanyAdsCatalogParams = {},
): Promise<CompanyAdListItem[] | null> {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!base) return null
  const query: Record<string, string> = {
    limit: String(params.limit ?? 24),
    offset: String(params.offset ?? 0),
  }
  if (params.q?.trim()) query.q = params.q.trim()
  if (params.category?.trim() && params.category !== 'all') {
    query.category = params.category.trim()
  }
  if (params.location?.trim()) query.location = params.location.trim()
  try {
    const res = await $fetch<CompanyAdListItem[]>(`${base}/api/company-ads`, { query })
    return Array.isArray(res) ? res : []
  } catch {
    return null
  }
}
