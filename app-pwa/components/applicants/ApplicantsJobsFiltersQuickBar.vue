<template>
  <div class="flex min-w-0 w-full">
    <button
      type="button"
      class="flex h-[60px] w-full is-clickable select-none items-center justify-center gap-2 rounded-full px-5 font-dmSans text-base font-semibold outline-none shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#22c55e]"
      :class="
        ctx.hasNewOnly
          ? 'bg-amber-600 text-white shadow-[0_3px_12px_rgba(0,0,0,0.2)]'
          : 'bg-amber-400 text-amber-950 hover:bg-amber-500'
      "
      :aria-pressed="ctx.hasNewOnly"
      :aria-label="S.applicantsFilterHasNew"
      @click.stop="ctx.toggleHasNew()"
    >
      <AppIcon name="bell" :size="16" class="shrink-0" />
      <span class="truncate">{{ S.applicantsFilterHasNew }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { S } from '~/utils/strings'
import {
  APPLICANTS_JOBS_FILTERS_KEY,
  type ApplicantsJobsFiltersUi,
} from './applicants-jobs-filters-context'

const ctx = inject(APPLICANTS_JOBS_FILTERS_KEY) as ApplicantsJobsFiltersUi
</script>
