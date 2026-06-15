import { describe, expect, it } from 'vitest'
import { jobPhotoThumbnailSrcForStage } from '~/utils/job-photo-url'
import { JOB_CARD_PLACEHOLDER_PATH } from '~/utils/job'

describe('jobPhotoThumbnailSrcForStage', () => {
  const thumb =
    'https://x.supabase.co/storage/v1/object/public/job-photos/u/cover/a_thumb.jpg'
  const full =
    'https://x.supabase.co/storage/v1/object/public/job-photos/u/cover/a.jpg'

  it('returns thumb URL at stage 0', () => {
    expect(jobPhotoThumbnailSrcForStage(thumb, 0)).toBe(thumb)
  })

  it('falls back to full URL at stage 1', () => {
    expect(jobPhotoThumbnailSrcForStage(thumb, 1)).toBe(full)
  })

  it('falls back to placeholder at stage 2', () => {
    expect(jobPhotoThumbnailSrcForStage(thumb, 2)).toBe(JOB_CARD_PLACEHOLDER_PATH)
  })

  it('uses placeholder when full URL is unchanged', () => {
    expect(jobPhotoThumbnailSrcForStage(full, 1)).toBe(JOB_CARD_PLACEHOLDER_PATH)
  })
})
