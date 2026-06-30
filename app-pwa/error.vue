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
    <!-- Temporary debug overlay. Remove after the /ponuka/:id crash is fixed. -->
    <pre
      style="position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1e1e1e;color:#f8f8f2;font-size:11px;padding:12px;max-height:50vh;overflow:auto;white-space:pre-wrap;word-break:break-all;"
    >NUXT ERROR: {{ errorDebug }}
VUE SSR: {{ ssrVueError && ssrVueError.message ? ssrVueError : '(no vue:error fired)' }}</pre>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { isNotFoundError } from '~/utils/not-found'

const error = useError()

// Persisted via useState so it survives SSR→hydration.
const ssrVueError = useState<{ message: string; info: string; stack: string } | null>('ssr-vue-error', () => null)

const errorDebug = computed(() => {
  const e = error.value
  if (!e) return '(none)'
  return JSON.stringify({
    statusCode: e.statusCode,
    message: e.message,
    statusMessage: e.statusMessage,
    cause: String((e as { cause?: unknown }).cause ?? ''),
    stack: String((e as { stack?: unknown }).stack ?? '').split('\n').slice(0, 8).join(' | '),
  }, null, 2)
})

useHead(() => ({
  title: isNotFoundError(error.value)
    ? S.errorPageTitle404
    : S.errorPageTitleError,
}))
</script>
