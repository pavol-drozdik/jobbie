const cache = new Map<string, { url: string; expiresAt: number }>()

const EXPIRY_BUFFER_MS = 30_000

export function getCachedCvPhotoSignedUrl(cvId: string): string | null {
  const id = cvId.trim()
  if (!id) {
    return null
  }
  const entry = cache.get(id)
  if (!entry) {
    return null
  }
  if (Date.now() >= entry.expiresAt - EXPIRY_BUFFER_MS) {
    cache.delete(id)
    return null
  }
  return entry.url
}

export function setCachedCvPhotoSignedUrl(
  cvId: string,
  url: string,
  expiresInSeconds: number,
): void {
  const id = cvId.trim()
  const raw = url.trim()
  if (!id || !raw || expiresInSeconds <= 0) {
    return
  }
  cache.set(id, {
    url: raw,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  })
}

export function clearCachedCvPhotoSignedUrl(cvId: string): void {
  const id = cvId.trim()
  if (id) {
    cache.delete(id)
  }
}
