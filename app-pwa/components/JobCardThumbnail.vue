<template>
  <div class="job-card-thumb" aria-hidden="true">
    <NuxtImg
      class="job-card-thumb-img"
      :src="imageSrc"
      alt=""
      width="400"
      height="300"
      loading="lazy"
      decoding="async"
      format="webp"
      quality="82"
      @error="onThumbnailError"
    />
    <div v-if="job.is_urgent" class="job-card-thumb-urgent-mark">
      <AppIcon name="bolt" :size="14" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Job } from '~/utils/job'
import { getJobCardThumbnailSrc, JOB_CARD_PLACEHOLDER_PATH } from '~/utils/job'
import { jobPhotoFullPublicUrl } from '~/utils/job-photo-url'
import { resolvePublicImageUrl } from '~/utils/public-image-url'

const props = defineProps<{
  job: Job
}>()

const fullResolvedUrl = computed(() =>
  resolvePublicImageUrl(getJobCardThumbnailSrc(props.job)),
)
const imageSrc = ref<string>(fullResolvedUrl.value)
let fallbackStage = 0

watch(
  () => props.job,
  () => {
    fallbackStage = 0
    imageSrc.value = fullResolvedUrl.value
  },
  { deep: true },
)

function onThumbnailError(): void {
  if (fallbackStage === 0) {
    fallbackStage = 1
    const full = jobPhotoFullPublicUrl(fullResolvedUrl.value)
    if (full && full !== imageSrc.value) {
      imageSrc.value = full
      return
    }
  }
  if (fallbackStage >= 1) {
    fallbackStage = 2
    imageSrc.value = JOB_CARD_PLACEHOLDER_PATH
  }
}
</script>
