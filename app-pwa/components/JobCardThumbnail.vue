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
import { resolvePublicImageUrl } from '~/utils/public-image-url'

const props = defineProps<{
  job: Job
}>()

const imageSrc = ref<string>(getJobCardThumbnailSrc(props.job))
let fallbackUsed = false

watch(
  () => props.job,
  (job: Job) => {
    fallbackUsed = false
    imageSrc.value = resolvePublicImageUrl(getJobCardThumbnailSrc(job))
  },
  { deep: true },
)

function onThumbnailError(): void {
  if (fallbackUsed) {
    return
  }
  fallbackUsed = true
  imageSrc.value = JOB_CARD_PLACEHOLDER_PATH
}
</script>
