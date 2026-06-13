/** Client helpers for job photo thumb URLs (mirrors backend `job-photo-url.util.ts`). */

export function jobPhotoFullPublicUrl(maybeThumbUrl: string): string {
  const trimmed = maybeThumbUrl.trim()
  const marker = '_thumb.'
  const idx = trimmed.indexOf(marker)
  if (idx > 0) {
    return `${trimmed.slice(0, idx)}${trimmed.slice(idx + '_thumb'.length)}`
  }
  return trimmed
}

export function isSupabaseJobPhotoPublicUrl(url: string): boolean {
  return /\/job-photos\//i.test(url.trim())
}
