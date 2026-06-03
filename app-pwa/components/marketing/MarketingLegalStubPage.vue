<template>
  <div class="min-h-[50vh] bg-marketing-mint px-5 pb-20 pt-[calc(5.5rem+env(safe-area-inset-top))] font-dmSans md:pt-28">
    <div class="mx-auto max-w-2xl">
      <h1 class="m-0 font-dmSans text-[32px] font-extrabold leading-tight text-black sm:text-[40px]">
        {{ title }}
      </h1>
      <p class="mt-4 font-dmSans text-lg font-medium text-black/65">
        {{ S.footerPageSoon }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

defineProps<{
  title: string
}>()
</script>
