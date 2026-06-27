<template>
  <div class="flex min-w-0 w-full">
    <button
      type="button"
      class="flex h-[60px] w-full is-clickable select-none items-center justify-center gap-2 rounded-full px-5 font-dmSans text-base font-semibold outline-none shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#22c55e]"
      :class="
        ctx.filters.urgent_only
          ? 'bg-amber-600 text-white shadow-[0_3px_12px_rgba(0,0,0,0.2)]'
          : 'bg-amber-400 text-amber-950 hover:bg-amber-500'
      "
      :aria-pressed="ctx.filters.urgent_only"
      :aria-label="S.urgentOnly"
      @click.stop="ctx.toggleUrgent"
    >
      <AppIcon name="bolt" :size="16" class="shrink-0" />
      <span class="truncate">{{ S.urgentOnly }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { FIND_LIST_FILTERS_KEY, type FindListFiltersUi } from './find-list-filters-context'
import { S } from '~/utils/strings'

const ctx = inject(FIND_LIST_FILTERS_KEY) as FindListFiltersUi
</script>
