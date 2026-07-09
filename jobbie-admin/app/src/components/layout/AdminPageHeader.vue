<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 class="m-0 text-2xl font-bold tracking-tight text-slate-900">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="m-0 mt-1 text-sm text-slate-500">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
