/** Normalize `job_offers.photos` (jsonb array, legacy object, or string) to public URLs. */
export function normalizeJobPhotos(photos: unknown): string[] {
  if (photos == null) {
    return [];
  }
  if (Array.isArray(photos)) {
    return photos.filter(
      (url): url is string => typeof url === 'string' && url.trim().length > 0,
    );
  }
  if (typeof photos === 'string') {
    const trimmed = photos.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return normalizeJobPhotos(JSON.parse(trimmed) as unknown);
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  if (typeof photos === 'object') {
    return Object.values(photos as Record<string, unknown>).filter(
      (url): url is string => typeof url === 'string' && url.trim().length > 0,
    );
  }
  return [];
}
