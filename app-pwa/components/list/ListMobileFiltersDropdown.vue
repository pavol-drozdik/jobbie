<template>
  <div class="relative marketing:hidden">
    <slot name="search" />
    <button
      type="button"
      class="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/80 bg-transparent py-2.5 font-dmSans text-base font-semibold text-white transition-colors hover:bg-white/10"
      :aria-expanded="open"
      :aria-controls="panelId"
      :aria-label="open ? lessLabel : moreLabel"
      @click="emit('update:open', !open)"
    >
      <span>{{ open ? lessLabel : moreLabel }}</span>
      <AppIcon
        name="chevron-down"
        :size="18"
        class="shrink-0 transition-transform duration-200"
        :class="open ? '-rotate-180' : ''"
      />
    </button>
    <div
      v-if="open"
      :id="panelId"
      class="pt-4"
      role="region"
      :aria-label="panelRegionLabel"
      :aria-hidden="!open"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  open: boolean
  moreLabel: string
  lessLabel: string
  panelRegionLabel: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const panelId = `list-mobile-filters-${useId()}`
</script>
