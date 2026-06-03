<template>
  <section
    ref="shellRef"
    class="mb-[50px] mt-[30px] w-full max-w-[1400px] rounded-[20px] bg-[linear-gradient(155deg,rgb(21,128,61)_0%,rgb(34,197,94)_100%)] p-6 marketing:p-[50px]"
  >
    <h1
      v-if="pageTitle"
      class="m-0 mb-5 font-dmSans text-[28px] font-extrabold leading-tight text-white marketing:mb-6 marketing:text-[34px]"
    >
      {{ pageTitle }}
    </h1>
    <p
      v-if="pageMeta"
      class="mb-5 mt-0 max-w-[720px] font-dmSans text-base font-medium leading-relaxed text-white/85 marketing:mb-6 marketing:text-lg"
    >
      {{ pageMeta }}
    </p>

    <div class="marketing:hidden">
    <ListMobileFiltersDropdown
      v-model:open="mobileOpen"
      :more-label="S.listSearchShowMore"
      :less-label="S.listSearchShowLess"
      :panel-region-label="S.listFiltersPanelRegionAria"
    >
      <template #search>
        <ApplicantsFilterSearch
          :model-value="search"
          :placeholder="S.applicantsSearchPlaceholder"
          @update:model-value="emit('update:search', $event)"
          @submit="emit('submit')"
        />
      </template>
      <ApplicantsListFiltersSortDropdown />
    </ListMobileFiltersDropdown>
    </div>

    <div class="hidden marketing:block">
      <div class="grid min-w-0 w-full grid-cols-3 items-center gap-5">
        <div class="col-span-2 min-w-0">
          <ApplicantsFilterSearch
            class="min-h-[60px] items-center"
            :model-value="search"
            :placeholder="S.applicantsSearchPlaceholder"
            @update:model-value="emit('update:search', $event)"
            @submit="emit('submit')"
          />
        </div>
        <ApplicantsListFiltersSortDropdown inline class="min-w-0" />
      </div>
    </div>

    <div class="mt-5 overflow-x-auto">
      <div class="flex min-w-max gap-2 pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-full px-4 py-2 font-dmSans text-sm font-semibold transition-colors"
          :class="activeTab === tab.id ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'"
          @click="onTabClick(tab.id)"
        >
          {{ tab.label }} ({{ countForTab(tab.id) }})
        </button>
      </div>
    </div>

    <div
      v-if="jobId"
      class="mt-5 flex flex-wrap items-center gap-4 border-t border-white/25 pt-5 marketing:gap-5"
    >
      <NuxtLink
        :to="ROUTES.jobDetail(jobId)"
        class="font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4"
      >
        {{ S.applicantsViewJob }}
      </NuxtLink>
      <NuxtLink
        :to="`/app/jobs/${jobId}/edit`"
        class="font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4"
      >
        {{ S.applicantsEditJob }}
      </NuxtLink>
      <button
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4 disabled:cursor-wait disabled:opacity-70"
        :disabled="exporting"
        @click="emit('export')"
      >
        {{
          exporting
            ? S.applicantsExportInterviewExcelLoading
            : S.applicantsExportInterview
        }}
      </button>
      <NuxtLink
        :to="ROUTES.settingsFirmaAutoReplies"
        class="font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4"
      >
        {{ S.applicantsAutoRepliesLink }}
      </NuxtLink>
    </div>

    <button
      v-if="hasActiveFilters"
      type="button"
      class="mt-4 border-none bg-transparent font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4"
      @click="onClear"
    >
      {{ S.clearFilters }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { APPLICANT_LIST_STATUS_TABS } from '~/utils/applicant-status'
import type { ApplicantStatusCounts } from '~/types/employer-applicants'
import ApplicantsFilterSearch from '~/components/applicants/ApplicantsFilterSearch.vue'
import ApplicantsListFiltersSortDropdown from '~/components/applicants/ApplicantsListFiltersSortDropdown.vue'

const props = defineProps<{
  pageTitle?: string
  pageMeta?: string
  jobId?: string
  search: string
  activeTab: string
  statusCounts: ApplicantStatusCounts | null
  hasActiveFilters: boolean
  exporting?: boolean
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:activeTab': [value: string]
  submit: []
  clear: []
  export: []
  'mobile-panel-close': []
}>()

const shellRef = ref<HTMLElement | null>(null)
const mobileOpen = ref(false)
const tabs = APPLICANT_LIST_STATUS_TABS

function countForTab(id: string): number {
  if (!props.statusCounts) return 0
  if (id === 'all') return props.statusCounts.total
  return (props.statusCounts as Record<string, number>)[id] ?? 0
}

function onTabClick(id: string): void {
  if (props.activeTab === id) return
  emit('update:activeTab', id)
  emit('submit')
}

function onClear(): void {
  mobileOpen.value = false
  emit('clear')
}

watch(mobileOpen, (open) => {
  if (!open) {
    emit('mobile-panel-close')
  }
})

defineExpose({ shellRef, mobileOpen })
</script>
