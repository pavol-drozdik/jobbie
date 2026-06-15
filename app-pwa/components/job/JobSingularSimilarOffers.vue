<template>
  <div
    v-if="jobs.length > 0"
    class="rounded-[20px] bg-white p-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]"
  >
    <h3 class="m-0 text-lg font-extrabold text-black">{{ S.jobSimilarOffers }}</h3>
    <div class="mt-4 flex flex-col gap-3">
      <NuxtLink
        v-for="sj in jobs"
        :key="sj.id"
        :to="ROUTES.jobDetail(sj.id)"
        class="flex cursor-pointer items-center gap-3.5 rounded-[14px] p-3 no-underline transition-colors hover:bg-marketing-mint/60"
      >
        <img
          class="size-14 min-h-14 min-w-14 shrink-0 rounded-xl bg-marketing-panel object-cover"
          :src="similarThumbSrc(sj)"
          alt=""
          width="56"
          height="56"
          loading="lazy"
          decoding="async"
          @error="onSimilarThumbError(sj)"
        >
        <div class="min-w-0 flex-1">
          <div class="mb-1 min-w-0 break-words text-[15px] font-bold text-black line-clamp-2">{{ sj.title }}</div>
          <div class="flex flex-wrap gap-2.5">
            <span class="flex min-w-0 max-w-full items-center gap-1 text-[13px] font-medium text-black/45">
              <AppIcon name="map-pin" :size="11" class="shrink-0 text-marketing-green" />
              <span class="min-w-0 truncate">{{ getJobCardCityDisplay(sj) }}</span>
            </span>
            <span class="flex items-center gap-1 text-[13px] font-medium text-black/45">
              <AppIcon name="currency" :size="11" class="shrink-0 text-marketing-green" />
              {{ getJobCardPayDisplay(sj) }}
            </span>
          </div>
        </div>
        <AppIcon name="chevron-right" :size="14" class="shrink-0 text-black/20" />
      </NuxtLink>
      <NuxtLink
        :to="ROUTES.find"
        class="flex cursor-pointer items-center justify-center gap-1.5 rounded-[14px] p-3 text-[15px] font-bold text-marketing-green no-underline transition-colors hover:bg-marketing-mint/60"
      >
        {{ S.jobViewAllOffers }}
        <AppIcon name="arrow-right" :size="14" class="shrink-0" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { getJobCardCityDisplay, getJobCardPayDisplay, getJobCardThumbnailSrc } from '~/utils/job'
import type { Job } from '~/utils/job'
import {
  jobPhotoThumbnailSrcForStage,
  type JobPhotoThumbnailFallbackStage,
} from '~/utils/job-photo-url'

const props = defineProps<{
  jobs: Job[]
}>()

const thumbFallbackStages = ref<Record<string, JobPhotoThumbnailFallbackStage>>({})

watch(
  () => props.jobs,
  (list) => {
    const ids = new Set(list.map((job) => job.id))
    const next = { ...thumbFallbackStages.value }
    for (const id of Object.keys(next)) {
      if (!ids.has(id)) {
        delete next[id]
      }
    }
    thumbFallbackStages.value = next
  },
)

function similarThumbSrc(job: Job): string {
  const stage = thumbFallbackStages.value[job.id] ?? 0
  return jobPhotoThumbnailSrcForStage(getJobCardThumbnailSrc(job), stage)
}

function onSimilarThumbError(job: Job): void {
  const current = thumbFallbackStages.value[job.id] ?? 0
  if (current >= 2) {
    return
  }
  thumbFallbackStages.value = {
    ...thumbFallbackStages.value,
    [job.id]: (current + 1) as JobPhotoThumbnailFallbackStage,
  }
}
</script>
