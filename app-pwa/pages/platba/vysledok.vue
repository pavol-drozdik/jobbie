<template>
  <AuthMarketingSplitShell
    :panel-title="panelTitle"
    :panel-subtitle="panelSubtitle"
    :show-back-link="false"
  >
    <template v-if="phase === 'processing'">
      <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
        {{ S.checkoutResultHeadingProcessing }}
        <span class="text-marketing-green">{{ S.checkoutResultHeadingProcessingAccent }}</span>
      </h1>
      <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
        {{ S.checkoutResultProcessing }}
      </p>
      <div class="flex justify-center py-4" aria-hidden="true">
        <span
          class="inline-block size-10 animate-spin rounded-full border-[3px] border-marketing-green/25 border-t-marketing-green"
        />
      </div>
    </template>

    <template v-else-if="phase === 'success'">
      <div
        class="mb-6 flex size-16 items-center justify-center rounded-full bg-marketing-mint"
        aria-hidden="true"
      >
        <svg class="size-8 text-marketing-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
        {{ S.checkoutResultHeadingSuccess }}
        <span class="text-marketing-green">{{ S.checkoutResultHeadingSuccessAccent }}</span>
      </h1>
      <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
        {{ message }}
      </p>
      <NuxtLink
        :to="returnPath"
        class="inline-flex h-14 w-full items-center justify-center rounded-full bg-marketing-green text-lg font-bold text-white no-underline transition-opacity duration-200 hover:opacity-[0.88]"
      >
        {{ returnLabel }}
      </NuxtLink>
    </template>

    <template v-else>
      <div
        class="mb-6 flex size-16 items-center justify-center rounded-full bg-red-50"
        aria-hidden="true"
      >
        <svg class="size-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
        {{ S.checkoutResultHeadingFailed }}
        <span class="text-red-500">{{ S.checkoutResultHeadingFailedAccent }}</span>
      </h1>
      <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
        {{ message }}
      </p>
      <NuxtLink
        :to="retryCheckoutPath"
        class="mb-4 inline-flex h-14 w-full items-center justify-center rounded-full bg-marketing-green text-lg font-bold text-white no-underline transition-opacity duration-200 hover:opacity-[0.88]"
      >
        {{ S.checkoutResultRetryCta }}
      </NuxtLink>
      <NuxtLink
        :to="returnPath"
        class="inline-flex h-14 w-full items-center justify-center rounded-full border-[1.5px] border-black/12 bg-white text-lg font-semibold text-black no-underline transition-[background-color,border-color] duration-150 hover:border-black/20 hover:bg-marketing-soft"
      >
        {{ returnLabel }}
      </NuxtLink>
    </template>
  </AuthMarketingSplitShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const { phase, message, returnPath, retryCheckoutPath, returnLabel } = useCheckoutResult()

const panelTitle = computed(() => {
  if (phase.value === 'success') return S.checkoutResultPanelTitleSuccess
  if (phase.value === 'failed') return S.checkoutResultPanelTitleFailed
  return S.checkoutResultPanelTitleProcessing
})

const panelSubtitle = computed(() => {
  if (phase.value === 'success') return S.checkoutResultPanelSubtitleSuccess
  if (phase.value === 'failed') return S.checkoutResultPanelSubtitleFailed
  return S.checkoutResultPanelSubtitleProcessing
})
</script>
