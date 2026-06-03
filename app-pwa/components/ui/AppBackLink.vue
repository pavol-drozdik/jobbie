<template>
  <div class="flex min-w-0 flex-col gap-1">
    <NuxtLink
      :to="to"
      class="mb-0 inline-flex w-fit max-w-full items-center gap-2 rounded-lg font-dmSans font-semibold no-underline outline-none ring-marketing-green transition-colors focus-visible:ring-2"
      :class="linkClass"
    >
      <AppIcon name="chevron-left" :size="chevronSize" class="shrink-0" aria-hidden="true" />
      <span class="min-w-0 truncate">{{ label }}</span>
    </NuxtLink>
    <div v-if="$slots.breadcrumb" class="min-w-0 text-sm leading-snug text-black/50">
      <slot name="breadcrumb" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    to: string
    label: string
    /** default: green compact; comfort: muted base + green on hover (e.g. job detail) */
    size?: 'default' | 'comfort'
  }>(),
  { size: 'default' },
)

const linkClass = computed(() =>
  props.size === 'comfort'
    ? 'text-base text-black/45 hover:text-marketing-green hover:underline'
    : 'text-sm text-marketing-green hover:underline',
)

const chevronSize = computed(() => (props.size === 'comfort' ? 18 : 16))
</script>
