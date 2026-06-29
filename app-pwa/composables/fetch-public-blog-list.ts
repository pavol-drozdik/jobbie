import type { BlogListResponse } from '~/composables/useBlog'
import { publicContentApiUrl } from '~/utils/api-base-url'

/** Fetch first page of public blog posts for SSR/SEO. */
export async function fetchPublicBlogList(
  params: { limit?: number; category?: string } = {},
): Promise<BlogListResponse | null> {
  const query: Record<string, string> = {}
  if (params.limit) query.limit = String(params.limit)
  if (params.category && params.category !== 'all') query.category = params.category
  try {
    return await $fetch<BlogListResponse>(publicContentApiUrl('/api/blog'), { query })
  } catch {
    return null
  }
}
