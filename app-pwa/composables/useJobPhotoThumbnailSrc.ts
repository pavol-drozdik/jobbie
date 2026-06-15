import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import {
  jobPhotoThumbnailSrcForStage,
  type JobPhotoThumbnailFallbackStage,
} from '~/utils/job-photo-url'

/** Reactive thumb → full → placeholder fallback for a single job photo URL. */
export function useJobPhotoThumbnailSrc(source: MaybeRefOrGetter<string>) {
  const imageSrc = ref(jobPhotoThumbnailSrcForStage(toValue(source), 0))
  let fallbackStage: JobPhotoThumbnailFallbackStage = 0

  watch(
    () => toValue(source),
    (next) => {
      fallbackStage = 0
      imageSrc.value = jobPhotoThumbnailSrcForStage(next, 0)
    },
  )

  function onThumbnailError(): void {
    if (fallbackStage >= 2) {
      return
    }
    fallbackStage = (fallbackStage + 1) as JobPhotoThumbnailFallbackStage
    imageSrc.value = jobPhotoThumbnailSrcForStage(toValue(source), fallbackStage)
  }

  return { imageSrc, onThumbnailError }
}
