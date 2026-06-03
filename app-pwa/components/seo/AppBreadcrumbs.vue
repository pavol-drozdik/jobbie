<template>
  <nav aria-label="Breadcrumb" class="mb-4 font-dmSans text-sm text-black/55">
    <ol class="m-0 flex flex-wrap items-center gap-1.5 p-0 list-none">
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        class="inline-flex items-center gap-1.5"
      >
        <span v-if="index > 0" aria-hidden="true" class="text-black/35">/</span>
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="font-semibold text-marketing-green no-underline hover:underline"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="font-semibold text-black/75"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export type AppBreadcrumbItem = {
  label: string
  to?: string
}

defineProps<{
  items: AppBreadcrumbItem[]
}>()
</script>
