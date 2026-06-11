<template>
  <div class="min-h-screen bg-marketing-mint font-dmSans text-black">
    <div class="mx-auto box-border w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-5 sm:pt-7">
      <NuxtLink
        to="/ponuky-na-email"
        class="inline-flex items-center gap-1.5 text-[14px] font-semibold text-marketing-green hover:underline"
      >
        <AppIcon name="chevron-left" :size="16" class="opacity-80" />
        {{ S.jobEmailAlertsBackToHub }}
      </NuxtLink>

      <div class="mt-10 lg:mt-12">
        <div
          class="mx-auto max-w-xl rounded-[20px] border border-black/[0.06] border-l-[4px] border-l-marketing-green bg-white pl-5 pr-6 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:pl-6 sm:pr-8 sm:py-8"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
            <div class="flex shrink-0 justify-center sm:pt-0.5">
              <span class="flex size-11 items-center justify-center rounded-full bg-marketing-panel text-marketing-green">
                <AppIcon name="bell" :size="22" />
              </span>
            </div>
            <div class="min-w-0 text-center sm:text-left">
              <h1 class="m-0 font-dmSans text-[22px] font-extrabold leading-tight text-black sm:text-[24px]">
                {{ S.jobEmailAlertsPausedTitle }}
              </h1>
              <p
                v-if="pauseLinkInvalid"
                class="m-0 mt-2 text-[15px] leading-relaxed text-red-600"
              >
                {{ S.jobEmailAlertsPauseLinkInvalid }}
              </p>
              <p
                v-else
                class="m-0 mt-2 text-[15px] leading-relaxed text-black/50"
              >
                {{ S.jobEmailAlertsPausedBody }}
              </p>
              <p class="m-0 mt-5">
                <NuxtLink
                  to="/ponuky-na-email"
                  class="inline-flex h-11 items-center justify-center rounded-full bg-marketing-green px-6 text-[14px] font-bold text-white no-underline hover:opacity-95"
                >
                  {{ S.jobEmailAlertsPausedCta }}
                </NuxtLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['worker-only'] })
usePageSeo({ noindex: true })

const route = useRoute()
const pauseLinkInvalid = computed(
  () => String(route.query.error ?? '').trim() === 'invalid',
)

useHead({
  title: () =>
    pauseLinkInvalid.value
      ? S.jobEmailAlertsPauseLinkInvalid
      : S.jobEmailAlertsPausedTitle,
})
</script>
