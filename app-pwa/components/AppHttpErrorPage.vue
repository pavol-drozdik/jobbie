<template>
  <div
    class="flex min-h-[min(70vh,calc(100dvh-12rem))] flex-col items-center justify-center px-5 pb-16 pt-[calc(6.875rem+env(safe-area-inset-top))] font-dmSans md:pt-[calc(110px+env(safe-area-inset-top))]"
    role="alert"
  >
    <div
      class="flex w-full max-w-lg flex-col items-center rounded-[20px] border border-dashed border-black/15 bg-white px-6 py-12 text-center shadow-[0_0_12px_rgba(0,0,0,0.04)]"
    >
      <p
        class="m-0 font-dmSans text-[72px] font-extrabold leading-none tracking-tight text-marketing-green/90"
        aria-hidden="true"
      >
        {{ statusCode }}
      </p>
      <h1 class="m-0 mt-4 text-2xl font-extrabold text-black">
        {{ heading }}
      </h1>
      <p class="m-0 mt-3 max-w-md text-[15px] leading-relaxed text-black/55">
        {{ body }}
      </p>
      <div class="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <AppButton :to="ROUTES.home" variant="primary" class="sm:min-w-[10rem]">
          {{ S.errorPageCtaHome }}
        </AppButton>
        <AppButton :to="ROUTES.find" variant="outline" class="sm:min-w-[10rem]">
          {{ S.errorPageCtaSearch }}
        </AppButton>
        <AppButton
          v-if="canGoBack"
          variant="ghost"
          class="sm:min-w-[10rem]"
          @click="goBack"
        >
          {{ S.errorPageCtaBack }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { isNotFoundError } from '~/utils/not-found'

const props = defineProps<{
  error: {
    statusCode?: number
    message?: string
  } | null | undefined
}>()

const router = useRouter()

const isNotFound = computed(() => isNotFoundError(props.error))

const statusCode = computed(() => props.error?.statusCode ?? 500)

const heading = computed(() =>
  isNotFound.value ? S.errorPageNotFoundHeading : S.errorPageGenericHeading,
)

const body = computed(() => {
  if (import.meta.dev) {
    const msg = props.error?.message?.trim()
    if (msg) return msg
  }
  return isNotFound.value ? S.errorPageNotFoundLead : S.errorPageGenericLead
})

const canGoBack = computed(() => import.meta.client && window.history.length > 1)

async function goBack(): Promise<void> {
  if (canGoBack.value) {
    await router.back()
    void clearError()
    return
  }
  await clearError({ redirect: ROUTES.home })
}
</script>
