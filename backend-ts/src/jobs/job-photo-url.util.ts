import { normalizeJobPhotos } from './normalize-job-photos.util';

const JOB_PHOTOS_BUCKET_SEGMENT = '/job-photos/';

/** Storage path for a list-card thumbnail alongside the full job photo object. */
export function jobPhotoThumbStoragePath(storagePath: string): string {
  const trimmed = storagePath.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0) {
    return `${trimmed}_thumb.jpg`;
  }
  const base = trimmed.slice(0, dot);
  if (base.endsWith('_thumb')) {
    return trimmed;
  }
  return `${base}_thumb${trimmed.slice(dot)}`;
}

export function isSupabaseJobPhotoPublicUrl(url: string): boolean {
  const raw = url.trim().toLowerCase();
  return raw.includes(JOB_PHOTOS_BUCKET_SEGMENT);
}

/** Derive the public thumb URL from a full job photo URL (same origin/path convention). */
export function jobPhotoThumbPublicUrl(publicUrl: string): string {
  const trimmed = publicUrl.trim();
  if (!trimmed || !isSupabaseJobPhotoPublicUrl(trimmed)) {
    return trimmed;
  }
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0) {
    return trimmed;
  }
  const base = trimmed.slice(0, dot);
  if (base.endsWith('_thumb')) {
    return trimmed;
  }
  return `${base}_thumb${trimmed.slice(dot)}`;
}

/** List/catalog responses: prefer thumb URL for the cover image only. */
export function coverPhotosForJobList(photos: unknown): string[] {
  const normalized = normalizeJobPhotos(photos);
  const cover = normalized[0];
  if (!cover) {
    return [];
  }
  if (!isSupabaseJobPhotoPublicUrl(cover)) {
    return [cover];
  }
  return [jobPhotoThumbPublicUrl(cover)];
}
