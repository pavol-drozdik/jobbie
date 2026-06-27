<template>
  <article
    class="flex flex-col gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:flex-row sm:items-center sm:gap-4 sm:p-3.5 sm:pr-5"
  >
    <div class="flex min-w-0 flex-1 items-stretch gap-3">
      <CategoryHubGlyph :category="job.category" />
      <div class="min-w-0 flex-1">
        <NuxtLink
          :to="editHref"
          class="m-0 text-[16px] font-bold leading-snug text-black hover:text-marketing-green"
          @click="primeBootstrap"
        >
          {{ displayTitle }}
        </NuxtLink>
        <p class="m-0 mt-1 text-[13px] leading-snug text-black/45">
          {{ metaLine }}
        </p>
      </div>
    </div>
    <div class="flex w-full flex-col gap-2 pl-4 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:justify-end sm:pl-0">
      <NuxtLink
        v-if="job.is_draft"
        :to="editHref"
        class="inline-flex h-10 w-full items-center justify-center rounded-full bg-marketing-green px-4 text-[13px] font-bold text-white no-underline hover:opacity-95 sm:w-auto sm:min-w-[7.5rem] sm:flex-initial"
        @click="primeBootstrap"
      >
        {{ S.jobHubContinueJob }}
      </NuxtLink>
      <NuxtLink
        v-else
        :to="editHref"
        class="inline-flex h-10 w-full items-center justify-center rounded-full border border-black/12 bg-white px-4 text-[13px] font-semibold text-black/80 no-underline hover:bg-neutral-50 sm:w-auto sm:min-w-[7.5rem] sm:flex-initial"
        @click="primeBootstrap"
      >
        {{ S.jobHubEditJob }}
      </NuxtLink>
      <div
        class="flex w-full items-center gap-2 sm:contents"
        :class="canPreview ? '' : 'justify-end'"
      >
        <NuxtLink
          v-if="canPreview"
          :to="previewHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-black/12 bg-white px-4 text-[13px] font-semibold text-black/80 no-underline hover:bg-neutral-50 sm:min-w-[7.5rem] sm:flex-initial sm:px-4"
        >
          {{ S.cvPreviewOpen }}
        </NuxtLink>
        <details ref="moreDetailsRef" class="relative shrink-0">
        <summary
          class="inline-flex h-10 w-10 is-clickable list-none items-center justify-center rounded-full border border-black/10 bg-white text-[13px] font-semibold text-black/55 hover:bg-neutral-50 hover:text-black/75 [&::-webkit-details-marker]:hidden"
        >
          <span class="sr-only">{{ S.jobHubMoreOptions }}</span>
          <span aria-hidden="true" class="select-none text-[1.05rem] leading-none tracking-[-0.1em] text-black/40">⋮</span>
        </summary>
        <div
          class="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[12.5rem] overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-md"
        >
          <button
            type="button"
            class="flex w-full is-clickable px-4 py-2.5 text-left text-[14px] font-semibold text-black/80 hover:bg-black/[0.04]"
            @click="onRename"
          >
            {{ S.jobHubRenameJob }}
          </button>
          <button
            type="button"
            class="flex w-full is-clickable px-4 py-2.5 text-left text-[14px] font-semibold text-red-700 hover:bg-red-50"
            @click="onDeleteClick"
          >
            {{ S.jobHubDeleteJob }}
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
import { primeJobWizardBootstrap } from '~/utils/job-post-hub'
import { employmentTypeLabel } from '~/utils/employment-types'
import type { Job } from '~/utils/job'

const props = defineProps<{
  job: Job
  dateLine: string
  statusLabel: string
}>()

const emit = defineEmits<{
  rename: []
  delete: []
}>()

const moreDetailsRef = ref<HTMLDetailsElement | null>(null)

const editHref = computed(() =>
  props.job.is_foreign
    ? ROUTES.foreignJobWizard(props.job.id)
    : ROUTES.jobWizard(props.job.id),
)

const previewHref = computed(() => ROUTES.jobDetail(props.job.id))

const canPreview = computed(
  () => !props.job.is_draft && props.job.is_active,
)

const displayTitle = computed(
  () =>
    props.job.title?.trim() ||
    (props.job.is_foreign ? S.foreignJobHubDefaultTitle : S.jobHubDefaultTitle),
)

const employmentLabel = computed(() => {
  const emp = props.job.employment_types?.[0]
  return emp ? employmentTypeLabel(emp) : '—'
})

const metaLine = computed(() => {
  const parts = [employmentLabel.value, props.statusLabel]
  if (props.dateLine) parts.push(props.dateLine)
  return parts.join(' · ')
})

function primeBootstrap(): void {
  primeJobWizardBootstrap(props.job)
}

function closeMenu(): void {
  if (moreDetailsRef.value) {
    moreDetailsRef.value.open = false
  }
}

function onRename(): void {
  closeMenu()
  emit('rename')
}

function onDeleteClick(): void {
  closeMenu()
  emit('delete')
}
</script>
