<template>
  <section
    class="rounded-[20px] bg-white px-6 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:px-8"
  >
    <header class="mb-1">
      <div class="flex items-start gap-3">
        <span
          v-if="icon"
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-marketing-panel text-marketing-green"
        >
          <AppIcon :name="icon" :size="18" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="m-0 font-dmSans text-[20px] font-extrabold leading-tight text-black">
            {{ title }}
          </h2>
          <p v-if="description" class="mt-1.5 font-dmSans text-[14px] leading-snug text-black/45">
            {{ description }}
          </p>
        </div>
      </div>
    </header>
    <div class="divide-y divide-black/[0.06]">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AppIconName } from '~/utils/app-icons'

defineProps<{
  title: string
  description?: string
  icon?: AppIconName
}>()
</script>
