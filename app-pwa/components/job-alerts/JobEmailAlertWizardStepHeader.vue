<template>
  <div class="mb-[26px]">
    <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-marketing-panel px-3.5 py-2 text-[15px] font-extrabold text-marketing-green">
      {{ badge }}
    </div>
    <h1 class="m-0 text-[44px] font-black leading-none text-black max-[820px]:text-[34px]">
      {{ title }}
    </h1>
    <p class="mt-3 max-w-[720px] text-lg leading-snug text-black/[0.55]">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  badge: string
  title: string
  subtitle: string
}>()
</script>
