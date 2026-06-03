<template>
  <div class="grid min-w-0 w-full grid-cols-1 gap-5 md:grid-cols-2 marketing:grid-cols-3">
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="firmy-filter-category" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.firmyAdHighlight }}
      </label>
      <button
        id="firmy-filter-category"
        type="button"
        class="flex h-[60px] w-full cursor-pointer select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.categoryTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('category')"
      >
        <span class="min-w-0 truncate text-left">{{ ctx.categoryDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'category' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'category'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
        @click.stop
      >
        <button
          type="button"
          class="mb-1 w-full cursor-pointer rounded-[10px] border-0 border-b border-black/10 bg-transparent px-4 py-3 text-left font-dmSans text-lg font-semibold text-black/80 transition-colors hover:bg-marketing-mint"
          @click="ctx.clearCategories()"
        >
          {{ S.allCategories }}
        </button>
        <button
          v-for="opt in ctx.categoryMultiOptions"
          :key="opt.value"
          type="button"
          class="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          @click="ctx.toggleCategory(opt.value)"
        >
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded border-2 border-black/25 text-marketing-green"
            :class="ctx.isCategorySelected(opt.value) ? 'border-marketing-green bg-marketing-mint' : ''"
            aria-hidden="true"
          >
            <AppIcon v-if="ctx.isCategorySelected(opt.value)" name="check-circle" :size="14" />
          </span>
          <CategoryIcon :category="opt.value" :size="18" icon-class="shrink-0 text-marketing-green" />
          <span>{{ opt.label }}</span>
        </button>
      </div>
    </div>
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="firmy-filter-location" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.filterLocation }}
      </label>
      <AppSkMunicipalityCombobox
        id="firmy-filter-location"
        :model-value="ctx.locationFilter.trim()"
        variant="filter"
        allow-any
        :trigger-label-when-empty="S.filterLocation"
        @update:model-value="ctx.selectLocation"
      />
    </div>
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="firmy-filter-sort" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.filterSort }}
      </label>
      <button
        id="firmy-filter-sort"
        type="button"
        class="flex h-[60px] w-full cursor-pointer select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.sortTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('sort')"
      >
        <span>{{ ctx.sortDropdownLabel }}</span>
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
import { FIRM_LIST_FILTERS_KEY, type FirmListFiltersUi } from './firm-list-filters-context'

const ctx = inject(FIRM_LIST_FILTERS_KEY) as FirmListFiltersUi
</script>
