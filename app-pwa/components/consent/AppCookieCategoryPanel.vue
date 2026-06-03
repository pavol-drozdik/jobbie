<template>
  <section class="border-b border-black/10 py-1 last:border-b-0">
    <div class="flex items-start gap-3 py-3">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-start gap-2 border-none bg-transparent p-0 text-left"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="expanded = !expanded"
      >
        <span
          class="mt-1 inline-flex size-5 shrink-0 items-center justify-center text-black/45 transition-transform"
          :class="expanded ? 'rotate-90' : ''"
          aria-hidden="true"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-dmSans text-[15px] font-semibold leading-snug text-black">
            {{ title }}
          </span>
        </span>
      </button>
      <div class="shrink-0 pt-0.5" @click.stop>
        <slot name="toggle" />
      </div>
    </div>
    <div
      v-show="expanded"
      :id="panelId"
      class="pb-4 pl-7 pr-0 sm:pl-7"
    >
      <p class="m-0 font-dmSans text-[13px] leading-relaxed text-black/55">
        {{ description }}
      </p>
      <p
        v-if="rows.length === 0 && emptyHint"
        class="mt-3 font-dmSans text-[13px] leading-relaxed text-black/45"
      >
        {{ emptyHint }}
      </p>
      <AppCookieInventoryTable v-else-if="rows.length > 0" :rows="rows" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import type { CookieInventoryRow } from '~/utils/cookie-inventory'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    rows: CookieInventoryRow[]
    defaultExpanded?: boolean
    emptyHint?: string
  }>(),
  { defaultExpanded: false, emptyHint: undefined },
)

const panelId = useId()
const expanded = ref(props.defaultExpanded)

watch(
  () => props.defaultExpanded,
  (value) => {
    if (value) {
      expanded.value = true
    }
  },
)
</script>
