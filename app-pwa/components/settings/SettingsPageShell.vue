<template>
  <div class="mx-auto box-border w-full max-w-[900px] px-5 pb-16 pt-4 font-dmSans text-black lg:pb-20 lg:pt-6">
    <NuxtLink
      :to="backTo"
      class="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-marketing-green hover:underline"
    >
      <AppIcon name="chevron-left" :size="16" class="opacity-80" />
      {{ backLabel }}
    </NuxtLink>
    <header class="mb-6">
      <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight text-black sm:text-[32px]">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 max-w-2xl font-dmSans text-base text-black/55">
        {{ description }}
      </p>
    </header>
    <p
      v-if="flash"
      class="mb-4 rounded-lg border border-marketing-green/25 bg-marketing-mint px-3 py-2 text-sm font-medium text-marketing-green"
    >
      {{ flash }}
    </p>
    <p v-if="error" class="mb-4 text-sm text-red-600">
      {{ error }}
    </p>
    <div
      v-if="contentLayout === 'card'"
      class="rounded-[20px] bg-white px-6 py-7 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:px-8"
    >
      <slot />
    </div>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

withDefaults(
  defineProps<{
    title: string
    description?: string
    backLabel?: string
    backTo?: string
    flash?: string | null
    error?: string | null
    /** `card`: single white panel around slot; `stacked`: slot renders its own section cards */
    contentLayout?: 'card' | 'stacked'
  }>(),
  {
    backLabel: () => S.settingsDashboardBack,
    backTo: '/nastavenia',
    description: '',
    flash: null,
    error: null,
    contentLayout: 'card',
  },
)
</script>
