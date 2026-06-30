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
    <!-- Temporary debug: show Vue SSR error details. Remove after /ponuka/:id fix. -->
    <pre
      v-if="ssrVueError"
      style="position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1e1e1e;color:#f8f8f2;font-size:11px;padding:12px;max-height:50vh;overflow:auto;white-space:pre-wrap;word-break:break-all;"
    >SSR ERROR: {{ ssrVueError.message }}
INFO: {{ ssrVueError.info }}
STACK: {{ ssrVueError.stack }}</pre>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { isNotFoundError } from '~/utils/not-found'

const error = useError()

// Temporary: expose Vue SSR render error details for diagnosing production 500.
// Remove after the /ponuka/:id / /profesionali/:id crash is fixed.
const ssrVueError = import.meta.server
  ? (useRequestEvent()?.context?.ssrVueError as { message: string; info: string; stack: string } | undefined)
  : undefined

useHead(() => ({
  title: isNotFoundError(error.value)
    ? S.errorPageTitle404
    : S.errorPageTitleError,
}))
</script>
