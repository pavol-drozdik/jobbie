/**
 * Optional CDN/transform prefix for public Supabase image URLs (list cards, avatars).
 * Set NUXT_PUBLIC_MEDIA_CDN_URL to a reverse proxy or image worker origin.
 */
export function resolvePublicImageUrl(url: string | null | undefined): string {
  const raw = (url ?? '').trim()
  if (!raw || raw.startsWith('/') || raw.startsWith('blob:')) {
    return raw
  }
  const cdn = (import.meta.env.NUXT_PUBLIC_MEDIA_CDN_URL as string | undefined)?.trim()
  if (!cdn) {
    return raw
  }
  try {
    const base = cdn.replace(/\/$/, '')
    return `${base}?url=${encodeURIComponent(raw)}`
  } catch {
    return raw
  }
}
