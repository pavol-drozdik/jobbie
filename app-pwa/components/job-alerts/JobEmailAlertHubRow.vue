<template>
  <article
    class="flex flex-col gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:flex-row sm:items-center sm:gap-4 sm:p-3.5 sm:pr-5"
  >
    <div class="flex min-w-0 flex-1 items-stretch gap-3">
      <CategoryHubGlyph :category="categorySlug" />
      <div class="min-w-0 flex-1">
        <NuxtLink
          :to="`/ponuky-na-email/${encodeURIComponent(alert.id)}`"
          class="m-0 text-[16px] font-bold leading-snug text-black no-underline hover:text-marketing-green"
        >
          {{ alert.name }}
        </NuxtLink>
        <p class="m-0 mt-1 text-[13px] leading-snug text-black/45">
          {{ metaLine }}
        </p>
        <p v-if="dateLine" class="m-0 mt-0.5 text-[12px] leading-snug text-black/35">
          {{ dateLine }}
        </p>
      </div>
    </div>
    <div class="flex w-full flex-col gap-2 pl-4 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:justify-end sm:pl-0">
      <NuxtLink
        :to="{ path: ROUTES.find, query: findQuery }"
        class="inline-flex h-10 w-full items-center justify-center rounded-full bg-marketing-green px-4 text-[13px] font-bold text-white no-underline hover:opacity-95 sm:w-auto sm:min-w-[7.5rem] sm:flex-initial"
      >
        {{ S.jobEmailAlertsShowJobs }}
      </NuxtLink>
      <div class="flex w-full items-center gap-2 sm:contents">
        <NuxtLink
          :to="`/ponuky-na-email/${encodeURIComponent(alert.id)}`"
          class="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-black/12 bg-white px-4 text-[13px] font-semibold text-black/80 no-underline hover:bg-neutral-50 sm:min-w-[7.5rem] sm:flex-initial"
        >
          {{ S.jobAlertsEdit }}
        </NuxtLink>
        <button
          type="button"
          class="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-black/12 bg-white px-4 text-[13px] font-semibold text-black/80 hover:bg-neutral-50 sm:min-w-[7.5rem] sm:flex-initial sm:px-4"
          @click="emit('togglePause')"
        >
          {{ alert.is_active ? S.jobEmailAlertsPause : S.jobEmailAlertsResume }}
        </button>
        <details ref="moreDetailsRef" class="relative shrink-0">
        <summary
          class="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-black/10 bg-white text-[13px] font-semibold text-black/55 hover:bg-neutral-50 hover:text-black/75 [&::-webkit-details-marker]:hidden"
        >
          <span class="sr-only">{{ S.cvHubMoreOptions }}</span>
          <span aria-hidden="true" class="select-none text-[1.05rem] leading-none tracking-[-0.1em] text-black/40">⋮</span>
        </summary>
        <div
          class="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[12.5rem] overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-md"
        >
          <button
            type="button"
            class="flex w-full cursor-pointer px-4 py-2.5 text-left text-[14px] font-semibold text-red-700 hover:bg-red-50"
            @click="onDeleteClick"
          >
            {{ S.jobAlertsDelete }}
          </button>
        </div>
      </details>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import {
  buildFindQueryFromJobAlert,
  type JobEmailAlertDto,
} from '~/composables/useJobEmailAlerts'

const props = defineProps<{
  alert: JobEmailAlertDto
  metaLine: string
  dateLine: string
  categorySlug: string | null
}>()

const emit = defineEmits<{
  togglePause: []
  delete: []
}>()

const moreDetailsRef = ref<HTMLDetailsElement | null>(null)

const findQuery = computed(() => buildFindQueryFromJobAlert(props.alert))

function closeMenu(): void {
  if (moreDetailsRef.value) {
    moreDetailsRef.value.open = false
  }
}

function onDeleteClick(): void {
  closeMenu()
  emit('delete')
}
</script>
