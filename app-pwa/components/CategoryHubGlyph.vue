<template>
  <div
    class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-marketing-panel"
    aria-hidden="true"
  >
    <CategoryIcon :category="category" :size="20" icon-class="shrink-0 text-marketing-green" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    category?: string | null
  }>(),
  {
    category: 'ine',
  },
)
</script>
