<template>
  <AuthMarketingSplitShell
    :panel-title="S.confirmEmailPanelTitle"
    :panel-subtitle="S.confirmEmailPanelSubtitle"
    :show-back-link="false"
  >
    <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
      {{ S.confirmEmailHeading }}
      <span class="text-marketing-green">{{ S.confirmEmailHeadingAccent }}</span>
    </h1>
    <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
      {{ S.confirmEmailMessage }}
    </p>

    <a
      v-if="webmailUrl"
      :href="webmailUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mb-4 inline-flex h-14 w-full items-center justify-center rounded-full bg-marketing-green text-lg font-bold text-white no-underline transition-opacity duration-200 hover:opacity-[0.88]"
    >
      {{ S.confirmEmailOpenMailbox }}
    </a>

    <NuxtLink
      to="/auth/login"
      class="block text-center text-base font-semibold text-marketing-green no-underline transition-opacity duration-150 hover:opacity-75"
      :class="webmailUrl ? '' : 'mb-4 inline-flex h-14 w-full items-center justify-center rounded-full bg-marketing-green text-lg font-bold text-white'"
    >
      {{ S.alreadyConfirmedSignIn }}
    </NuxtLink>
  </AuthMarketingSplitShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { resolveWebmailUrl } from '~/utils/email-webmail-url'

definePageMeta({ layout: 'app' })

const { credentials } = useRegistration()

const webmailUrl = computed(() => resolveWebmailUrl(credentials.value?.email ?? ''))
</script>
