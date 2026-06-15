/** Supabase public object path segment (allowlist applies after this). */
export const PUBLIC_STORAGE_PATH = '/storage/v1/object/public/'

/** Public buckets served through `/media` (must match backend storage policy). */
export const MEDIA_PROXY_ALLOWED_BUCKETS = ['job-photos/', 'profile-avatars/'] as const

export const MEDIA_PROXY_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export function isAllowedMediaProxyUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) {
    return false
  }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') {
    return false
  }
  if (!parsed.hostname.endsWith('.supabase.co')) {
    return false
  }
  if (!parsed.pathname.includes(PUBLIC_STORAGE_PATH)) {
    return false
  }
  const afterPublic = parsed.pathname.split(PUBLIC_STORAGE_PATH)[1] ?? ''
  return MEDIA_PROXY_ALLOWED_BUCKETS.some((bucket) => afterPublic.startsWith(bucket))
}
