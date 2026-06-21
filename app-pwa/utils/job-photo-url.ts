/** Client helpers for job photo thumb URLs (mirrors backend `job-photo-url.util.ts`). */

import { JOB_CARD_PLACEHOLDER_PATH } from '~/utils/job'
import { resolvePublicImageUrl } from '~/utils/public-image-url'

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

/** 0 = thumb/list URL, 1 = full-size fallback, 2 = placeholder. */
export type JobPhotoThumbnailFallbackStage = 0 | 1 | 2

/** Resolve list-card image URL for a fallback stage (legacy jobs may lack `_thumb` objects). */
export function jobPhotoThumbnailSrcForStage(
  primaryUrl: string,
  stage: JobPhotoThumbnailFallbackStage,
): string {
  const resolvedPrimary = resolvePublicImageUrl(primaryUrl)
  if (stage === 0) {
    return resolvedPrimary
  }
  if (stage === 1) {
    const full = resolvePublicImageUrl(jobPhotoFullPublicUrl(resolvedPrimary))
    if (full && full !== resolvedPrimary) {
      return full
    }
  }
  return JOB_CARD_PLACEHOLDER_PATH
}
