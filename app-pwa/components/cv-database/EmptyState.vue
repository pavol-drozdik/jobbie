<template>
  <div
    class="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-black/15 bg-white px-6 py-14 text-center shadow-[0_0_12px_rgba(0,0,0,0.04)]"
    role="status"
  >
    <AppIcon v-if="icon" :name="icon" :size="40" class="mb-4 text-black/25" />
    <h3 class="m-0 text-lg font-bold text-black/80">{{ title }}</h3>
    <p class="mt-2 max-w-md text-[15px] leading-relaxed text-black/50">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    icon?: string
  }>(),
  { icon: 'search' },
)
</script>
