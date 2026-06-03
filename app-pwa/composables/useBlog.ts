import type { ApiResponse } from '~/composables/useApi'
import { isApiUnreachableStatus } from '~/utils/api-fetch'

export type BlogListItem = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  category: string
  published_at: string
  reading_time_minutes: number | null
}

export type BlogListResponse = {
  featured: BlogListItem | null
  items: BlogListItem[]
  next_cursor: string | null
}

export type BlogPostDetail = BlogListItem & {
  body_html: string
  seo_title: string | null
  seo_description: string | null
  author_name: string | null
  author_role: string | null
  author_bio: string | null
  tags: string[]
  related: BlogListItem[]
}

export type BlogPostFetchResult = {
  data: BlogPostDetail | null
  status: number
}

function isBlogListResponse(value: unknown): value is BlogListResponse {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.items) && ('featured' in v || 'next_cursor' in v)
}

function logBlogApiFailure(endpoint: string, res: ApiResponse<unknown>): void {
  if (!import.meta.dev) return
  let hint: string | undefined
  if (res.status === 404) {
    hint =
      'GET /api/blog returned 404 — the Nest API on port 8000 is probably stale. Restart: cd backend-ts && npm run start:dev'
  } else if (isApiUnreachableStatus(res.status)) {
    hint =
      'API unreachable — confirm backend-ts is running and NUXT_PUBLIC_API_BASE_URL matches (e.g. http://localhost:8000).'
  } else if (res.status === 401) {
    hint = 'Unexpected 401 on public blog route — report as a backend bug.'
  }
  console.warn(`[useBlog] ${endpoint} failed`, {
    status: res.status,
    ok: res.ok,
    hint,
    bodyPreview: res.body.slice(0, 400),
  })
}

export function useBlog() {
  const { api } = useApi()

  async function fetchList(params: {
    limit?: number
    cursor?: string
    category?: string
  } = {}): Promise<BlogListResponse | null> {
    const query: Record<string, string> = {}
    if (params.limit) query.limit = String(params.limit)
    if (params.cursor) query.cursor = params.cursor
    if (params.category && params.category !== 'all') query.category = params.category
    const endpoint = '/api/blog'
    const res = await api<BlogListResponse>(endpoint, {
      query,
      skipSessionExpiry: true,
    })
    if (!res.ok || !res.data || !isBlogListResponse(res.data)) {
      logBlogApiFailure(endpoint, res)
      return null
    }
    return res.data
  }

  async function fetchPost(slug: string): Promise<BlogPostFetchResult> {
    const endpoint = `/api/blog/${encodeURIComponent(slug)}`
    const res = await api<BlogPostDetail>(endpoint, {
      skipSessionExpiry: true,
    })
    if (!res.ok || !res.data) {
      logBlogApiFailure(endpoint, res)
      return { data: null, status: res.status }
    }
    return { data: res.data, status: res.status }
  }

  return { fetchList, fetchPost }
}
