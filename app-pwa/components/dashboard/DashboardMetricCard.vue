<template>
  <article class="rounded-2xl bg-marketing-surface px-6 py-[22px]">
    <p
      class="m-0 font-dmSans text-[36px] font-extrabold leading-none"
      :class="insufficientData ? 'text-black/20' : 'text-marketing-green'"
    >
      {{ value }}
    </p>
    <p class="mt-1 font-dmSans text-[15px] font-semibold text-black/70">
      {{ label }}
    </p>
    <p v-if="hint" class="mt-1 font-dmSans text-[14px] leading-snug text-black/45">
      {{ hint }}
    </p>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  value: string
  label: string
  hint?: string
  insufficientData?: boolean
}>()
</script>
