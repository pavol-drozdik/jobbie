<template>
  <NuxtLayout name="app">
    <AppHttpErrorPage v-if="error" :error="error" />
    <div
      v-else
      class="flex min-h-[min(70vh,calc(100dvh-12rem))] items-center justify-center px-5 pb-16 pt-[calc(6.875rem+env(safe-area-inset-top))] font-dmSans md:pt-[calc(110px+env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <p class="m-0 text-[15px] font-medium text-black/55">
        {{ S.errorPageRecovering }}
      </p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { isNotFoundError } from '~/utils/not-found'

const error = useError()

useHead(() => ({
  title: isNotFoundError(error.value)
    ? S.errorPageTitle404
    : S.errorPageTitleError,
}))
</script>
