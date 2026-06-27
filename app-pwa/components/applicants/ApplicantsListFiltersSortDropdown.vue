<template>
  <div
    class="relative flex min-w-0 flex-col"
    :class="inline ? 'w-full' : 'gap-2'"
  >
    <label
      v-if="!inline"
      for="applicants-list-filter-sort"
      class="font-dmSans text-base font-semibold text-white/90"
    >
      {{ S.applicantsFilterSort }}
    </label>
    <label v-else class="sr-only" for="applicants-list-filter-sort">{{ S.applicantsFilterSort }}</label>
    <button
      id="applicants-list-filter-sort"
      type="button"
      class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
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
        class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
        :class="{ 'bg-marketing-panel font-semibold': ctx.sort === opt.value }"
        @click="ctx.selectSort(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { S } from '~/utils/strings'
import {
  APPLICANTS_LIST_FILTERS_KEY,
  type ApplicantsListFiltersUi,
} from './applicants-list-filters-context'

withDefaults(
  defineProps<{
    /** Same row as search (no visible label); matches FindFiltersQuickBar height. */
    inline?: boolean
  }>(),
  { inline: false },
)

const ctx = inject(APPLICANTS_LIST_FILTERS_KEY) as ApplicantsListFiltersUi
</script>
