<template>
  <div
    class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0px_2px_4px_rgba(0,0,0,0.06)] sm:p-5"
  >
    <h3 class="mb-3 font-dmSans text-[17px] font-extrabold text-black">
      {{ title }}
    </h3>
    <div :class="[heightClass, 'relative']">
      <slot v-if="!emptyText" />
      <p
        v-else
        class="flex h-full min-h-[12rem] items-center justify-center px-4 text-center font-dmSans text-sm text-black/45"
      >
        {{ emptyText }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    /** Tailwind height class for chart container */
    chartHeight?: 'h-48' | 'h-56'
    /** When set, hides chart slot and shows empty message */
    emptyText?: string
  }>(),
  { chartHeight: 'h-56', emptyText: undefined },
)

const heightClass = computed(() => props.chartHeight)
</script>
