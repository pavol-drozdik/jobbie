<template>
  <NuxtLink
    :to="to"
    :class="[
      'group flex min-h-[120px] flex-col rounded-[18px] border-2 border-[#e5e7eb] bg-white p-5 shadow-[0px_2px_4px_rgba(0,0,0,0.06)] transition-colors',
      disabled
        ? 'pointer-events-none is-disabled-cursor opacity-55'
        : 'hover:border-marketing-green hover:bg-marketing-mint/40',
    ]"
    :aria-disabled="disabled || undefined"
  >
    <div class="mb-3 flex items-start justify-between gap-2">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-marketing-panel text-marketing-green"
      >
        <AppIcon :name="icon" :size="18" />
      </span>
      <AppIcon
        v-if="!disabled"
        name="chevron-right"
        :size="16"
        class="shrink-0 text-black/30 transition-transform group-hover:translate-x-0.5 group-hover:text-marketing-green"
      />
    </div>
    <h2 class="m-0 font-dmSans text-lg font-extrabold text-black">
      {{ title }}
    </h2>
    <p class="mt-1.5 flex-1 font-dmSans text-sm leading-snug text-black/50">
      {{ description }}
    </p>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  to: string
  title: string
  description: string
  icon: string
  disabled?: boolean
}>()
</script>
