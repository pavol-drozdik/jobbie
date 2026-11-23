<template>
  <div class="flex min-w-0 w-full">
    <button
      type="button"
      class="flex h-[60px] w-full is-clickable select-none items-center justify-center gap-2 rounded-full px-5 font-dmSans text-base font-semibold outline-none shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10231A]"
      :class="
        ctx.filters.urgent_only
          ? 'bg-jobbie-ink text-jobbie-lime shadow-brutal'
          : 'bg-jobbie-pink text-jobbie-ink shadow-brutal hover:bg-white'
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
