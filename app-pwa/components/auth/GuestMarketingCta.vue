<template>
  <div
    class="mx-auto max-w-lg rounded-[24px] border border-black/10 bg-white px-6 py-10 text-center font-dmSans shadow-[0px_3px_6px_1px_rgba(0,0,0,0.08)] sm:px-10"
  >
    <h1 class="mb-2 text-2xl font-extrabold tracking-tight text-black">
      {{ title }}
    </h1>
    <p class="mb-8 text-base leading-relaxed text-black/60">
      {{ subtitle }}
    </p>
    <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <NuxtLink
        :to="loginTo"
        class="inline-flex min-h-12 items-center justify-center rounded-full bg-marketing-green px-6 text-base font-bold text-white no-underline transition-opacity hover:opacity-90"
      >
        {{ S.jobAlertsGuestSignIn }}
      </NuxtLink>
      <NuxtLink
        :to="registerTo"
        class="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-marketing-green bg-white px-6 text-base font-bold text-marketing-green no-underline transition-colors hover:bg-marketing-mint"
      >
        {{ S.jobAlertsGuestRegister }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = defineProps<{
  title: string
  subtitle: string
  redirectPath: string
}>()

const loginTo = computed(() => ({
  path: '/auth/login',
  query: { redirect: props.redirectPath },
}))

const registerTo = computed(() => ({
  path: '/auth/register',
  query: { redirect: props.redirectPath },
}))
</script>
