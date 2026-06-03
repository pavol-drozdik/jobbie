<template>
  <div class="cards-grid px-3 py-2" role="status" aria-busy="true" :aria-label="label">
    <div v-for="i in itemCount" :key="i" class="job-card pointer-events-none overflow-hidden select-none">
      <div class="job-card-thumb animate-pulse bg-gray-200/80" />
      <div class="job-stripe opacity-40" />
      <div class="job-body space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="h-7 w-7 shrink-0 animate-pulse rounded-full bg-gray-200/90" />
          <div class="h-5 w-14 shrink-0 animate-pulse rounded-md bg-gray-200/80" />
        </div>
        <div class="h-4 w-[88%] max-w-[14rem] animate-pulse rounded bg-gray-200/85" />
        <div class="h-3 w-[62%] animate-pulse rounded bg-gray-200/70" />
        <div class="h-3 w-full animate-pulse rounded bg-gray-200/60" />
        <div class="flex items-center justify-between pt-1">
          <div class="h-3 w-16 animate-pulse rounded bg-gray-200/55" />
          <div class="h-7 w-20 animate-pulse rounded-full bg-gray-200/50" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    count?: number
    label?: string
  }>(),
  {
    count: 6,
    label: 'Načítava sa',
  },
)

const itemCount = computed(() => Math.min(12, Math.max(3, props.count)))
</script>
