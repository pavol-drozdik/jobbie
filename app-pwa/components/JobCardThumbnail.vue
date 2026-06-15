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
import { getJobCardThumbnailSrc } from '~/utils/job'
import { useJobPhotoThumbnailSrc } from '~/composables/useJobPhotoThumbnailSrc'

const props = defineProps<{
  job: Job
}>()

const thumbnailSource = computed(() => getJobCardThumbnailSrc(props.job))
const { imageSrc, onThumbnailError } = useJobPhotoThumbnailSrc(thumbnailSource)
</script>
