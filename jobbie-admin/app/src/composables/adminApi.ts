import { useAdminAuth } from './adminAuth'

import { ADMIN_API_BASE_URL } from '../config/admin-api-url'

const baseUrl = ADMIN_API_BASE_URL

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; body: string }

export async function adminApi<T>(
  path: string,
  options: {
    method?: string
    query?: Record<string, string>
    body?: unknown
  } = {},
): Promise<ApiResult<T>> {
  const { getAccessToken } = useAdminAuth()
  const token = getAccessToken()
  if (!token) {
    return { ok: false, status: 401, body: 'Not signed in' }
  }
  const url = new URL(`${baseUrl}/api${path}`)
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, v)
    }
  }
  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    return {
      ok: false,
      status: 0,
      body: `Admin API unreachable (${baseUrl}): ${msg}`,
    }
  }
  const text = await res.text()
  if (!res.ok) {
    return { ok: false, status: res.status, body: text }
  }
  if (!text) {
    return { ok: true, data: undefined as T, status: res.status }
  }
  try {
    return { ok: true, data: JSON.parse(text) as T, status: res.status }
  } catch {
    return { ok: false, status: res.status, body: text }
  }
}

export type DownloadResult =
  | { ok: true }
  | { ok: false; status: number; body: string }

export async function adminApiDownload(
  path: string,
  options: {
    query?: Record<string, string>
    filename: string
  },
): Promise<DownloadResult> {
  const { getAccessToken } = useAdminAuth()
  const token = getAccessToken()
  if (!token) {
    return { ok: false, status: 401, body: 'Not signed in' }
  }
  const url = new URL(`${baseUrl}/api${path}`)
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, v)
    }
  }
  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    return {
      ok: false,
      status: 0,
      body: `Admin API unreachable (${baseUrl}): ${msg}`,
    }
  }
  if (!res.ok) {
    const text = await res.text()
    return { ok: false, status: res.status, body: text.slice(0, 500) }
  }
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = options.filename
  a.click()
  URL.revokeObjectURL(objectUrl)
  return { ok: true }
}
