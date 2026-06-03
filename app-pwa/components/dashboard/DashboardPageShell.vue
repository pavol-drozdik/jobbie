<template>
  <div class="mx-auto box-border w-full max-w-[1100px] px-5 pb-16 pt-4 font-dmSans text-black lg:pb-20 lg:pt-6">
    <NuxtLink
      :to="ROUTES.profile"
      class="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-marketing-green hover:underline"
    >
      <AppIcon name="chevron-left" :size="16" class="opacity-80" />
      {{ S.dashboardBackProfile }}
    </NuxtLink>
    <header class="mb-6">
      <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight text-black sm:text-[32px]">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 max-w-2xl font-dmSans text-base text-black/55">
        {{ description }}
      </p>
    </header>
    <div
      class="rounded-[20px] bg-white px-5 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:px-8 sm:py-7"
    >
      <slot name="role-tabs" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

defineProps<{
  title: string
  description?: string
}>()
</script>
