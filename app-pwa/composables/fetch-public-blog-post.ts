import type { BlogPostDetail } from '~/composables/useBlog'
import { apiUrl } from '~/utils/api-base-url'

export type PublicBlogPostFetchResult = {
  data: BlogPostDetail | null
  status: number
}

function resolvePublicFetchUrl(path: string): string {
  const config = useRuntimeConfig()
  if (import.meta.dev && import.meta.server) {
    // Nitro devProxy forwards same-origin /api to Nest during SSR.
    return path
  }
  return apiUrl(String(config.public.apiBaseUrl ?? ''), path)
}

function readFetchErrorStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const e = error as { statusCode?: number; response?: { status?: number } }
  if (typeof e.statusCode === 'number' && e.statusCode > 0) return e.statusCode
  if (typeof e.response?.status === 'number' && e.response.status > 0) return e.response.status
  return 0
}

/** Fetch a public blog post for SSR/SEO (no auth required). */
export async function fetchPublicBlogPost(slug: string): Promise<PublicBlogPostFetchResult> {
  const trimmed = slug.trim()
  if (!trimmed) return { data: null, status: 0 }
  const path = `/api/blog/${encodeURIComponent(trimmed)}`
  try {
    const data = await $fetch<BlogPostDetail>(resolvePublicFetchUrl(path))
    return { data, status: 200 }
  } catch (error: unknown) {
    return { data: null, status: readFetchErrorStatus(error) }
  }
}
