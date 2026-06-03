import type { BlogPostDetail } from '~/composables/useBlog'

/** Fetch a public blog post for SSR/SEO (no auth required). */
export async function fetchPublicBlogPost(slug: string): Promise<BlogPostDetail | null> {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!base || !slug) return null
  try {
    return await $fetch<BlogPostDetail>(`${base}/api/blog/${encodeURIComponent(slug)}`)
  } catch {
    return null
  }
}
