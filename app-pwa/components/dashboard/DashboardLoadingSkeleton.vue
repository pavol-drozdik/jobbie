<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-3">
      <div
        v-for="i in metricCount"
        :key="`metric-sk-${i}`"
        class="h-[110px] animate-pulse rounded-2xl bg-marketing-soft"
      />
    </div>
    <div class="h-14 animate-pulse rounded-2xl bg-marketing-soft" />
    <div
      v-if="includeCharts"
      class="h-48 animate-pulse rounded-2xl bg-marketing-soft"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    metricCount?: number
    includeCharts?: boolean
  }>(),
  { metricCount: 3, includeCharts: true },
)
</script>
