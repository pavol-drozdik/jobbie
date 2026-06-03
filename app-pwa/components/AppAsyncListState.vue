<template>
  <div>
    <slot v-if="loading" name="loading">
      <div
        v-for="n in skeletonCount"
        :key="`sk-${n}`"
        class="animate-pulse overflow-hidden rounded-[15px] bg-marketing-surface shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]"
      >
        <div class="aspect-[4/3] bg-black/10" />
        <div class="space-y-3 p-5">
          <div class="h-10 w-4/5 rounded bg-black/10" />
          <div class="h-4 w-full rounded bg-black/10" />
        </div>
      </div>
    </slot>

    <div
      v-else-if="error"
      class="col-span-full rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center"
      role="alert"
    >
      <p class="m-0 text-sm font-semibold text-red-800">{{ error }}</p>
      <button
        v-if="showRetry"
        type="button"
        class="mt-3 cursor-pointer rounded-full border-none bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800"
        @click="$emit('retry')"
      >
        {{ resolvedRetryLabel }}
      </button>
    </div>

    <slot v-else-if="empty" name="empty">
      <p class="col-span-full py-12 text-center text-lg font-semibold text-black/55">
        {{ emptyMessage }}
      </p>
    </slot>

    <slot v-else />
  </div>
</template>

<script setup lang="ts">
// Standard loading / error+retry / empty slots for paginated or debounced lists.
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    error?: string | null
    empty?: boolean
    emptyMessage?: string
    skeletonCount?: number
    showRetry?: boolean
    retryLabel?: string
  }>(),
  {
    loading: false,
    error: null,
    empty: false,
    emptyMessage: '',
    skeletonCount: 8,
    showRetry: true,
    retryLabel: '',
  },
)

defineEmits<{ retry: [] }>()

const resolvedRetryLabel = computed(
  () => props.retryLabel || S.listFetchRetry,
)
</script>
