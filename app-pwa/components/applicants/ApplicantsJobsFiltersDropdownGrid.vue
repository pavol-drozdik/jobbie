<template>
  <div class="grid min-w-0 w-full grid-cols-1 gap-5 md:grid-cols-2 marketing:grid-cols-3">
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="applicants-filter-job-status" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.applicantsFilterJobStatus }}
      </label>
      <button
        id="applicants-filter-job-status"
        type="button"
        class="flex h-[60px] w-full cursor-pointer select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.jobStatusTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('jobStatus')"
      >
        <span class="min-w-0 truncate text-left">{{ ctx.jobStatusDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'jobStatus' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'jobStatus'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
        @click.stop
      >
        <button
          v-for="opt in ctx.jobStatusOptions"
          :key="opt.value"
          type="button"
          class="w-full cursor-pointer rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          :class="{ 'bg-marketing-panel font-semibold': ctx.jobStatus === opt.value }"
          @click="ctx.selectJobStatus(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="applicants-filter-sort" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.applicantsFilterSort }}
      </label>
      <button
        id="applicants-filter-sort"
        type="button"
        class="flex h-[60px] w-full cursor-pointer select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.sortTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('sort')"
      >
        <span class="min-w-0 truncate text-left">{{ ctx.sortDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'sort' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'sort'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-none"
        @click.stop
      >
        <button
          v-for="opt in ctx.sortOptions"
          :key="opt.value"
          type="button"
          class="w-full cursor-pointer rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          :class="{ 'bg-marketing-panel font-semibold': ctx.sort === opt.value }"
          @click="ctx.selectSort(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
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
