<template>

  <div

    v-if="authLoading"

    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"

  >

    {{ S.loading }}

  </div>

  <LoggedOutFeatureHero

    v-else-if="!user"

    :title="S.applicantsPageTitle"

    description="Prezeraj, filtruj a spravuj uchádzačov o tvoje pracovné pozície."

    :benefits="[

      'Prehľad uchádzačov podľa ponuky',

      'Filtrovanie a správa stavov prihlásení',

      'Export zoznamu na pohovor',

    ]"

    image-src="/home-design/applicants-illustration.png"

    image-alt="Správa uchádzačov"

    :redirect-path="redirectPath"

  />

  <div v-else class="mx-auto w-full max-w-[1400px] box-border px-5 pb-10 font-dmSans text-black/80">

    <ApplicantsJobsFiltersBar

      ref="filtersBarRef"

      :page-title="S.applicantsPageTitle"

      :search="search"

      :has-active-filters="hasActiveFilters"

      @update:search="search = $event"

      @submit="reload"

      @clear="clearFilters"

      @mobile-panel-close="openDropdown = null"

    />



    <p v-if="feedback" class="mb-4 text-sm font-semibold text-marketing-green">{{ feedback }}</p>

    <p v-if="loadError" class="mb-4 text-sm text-red-700">{{ loadError }}</p>



    <ApplicantsJobsList

      :jobs="jobs"

      :loading="loading"

      :empty-title="emptyTitle"

      :empty-description="emptyDescription"

    >

      <template v-if="showCreateCta" #empty-cta>

        <AppButton class="mt-6" :to="ROUTES.jobHub">

          {{ S.applicantsEmptyJobsCta }}

        </AppButton>

      </template>

    </ApplicantsJobsList>

    <div v-if="hasMoreHub && !loading" class="mt-6 flex justify-center">
      <AppButton
        variant="secondary"
        size="md"
        :disabled="loadingMore"
        @click="loadMoreHub"
      >
        {{ loadingMore ? S.loading : 'Načítať ďalšie ponuky' }}
      </AppButton>
    </div>

  </div>

</template>



<script setup lang="ts">

import { ROUTES } from '~/utils/app-routes'

import { S } from '~/utils/strings'

import type { EmployerJobHubItem } from '~/types/employer-applicants'

import ApplicantsJobsList from '~/components/applicants/ApplicantsJobsList.vue'

import ApplicantsJobsFiltersBar from '~/components/applicants/ApplicantsJobsFiltersBar.vue'

import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

import {

  APPLICANTS_JOBS_FILTERS_KEY,

  buildApplicantsJobsFiltersUi,

  type ApplicantsJobStatusFilter,

  type ApplicantsJobsSort,

} from '~/components/applicants/applicants-jobs-filters-context'



definePageMeta({ layout: 'app', middleware: ['customer-only'] })



const route = useRoute()

const redirectPath = computed(() => route.fullPath || ROUTES.applicants)

const { user, loading: authLoading } = useAuth()

const { fetchJobsHub, feedback, error: loadError, clearFeedback } = useEmployerApplicants()

const search = ref('')

const jobStatus = ref<ApplicantsJobStatusFilter>('all')

const hasNewOnly = ref(false)

const sort = ref<ApplicantsJobsSort>('last_application_desc')

const jobs = ref<EmployerJobHubItem[]>([])

const loading = ref(true)

const loadingMore = ref(false)

const hubOffset = ref(0)

const hubTotal = ref(0)

const HUB_PAGE_SIZE = 50

const hasMoreHub = computed(() => jobs.value.length < hubTotal.value)

const hadAnyJobs = ref(false)

const openDropdown = ref<string | null>(null)

const filtersBarRef = ref<{ shellRef: HTMLElement | null; mobileOpen: boolean } | null>(null)



const jobStatusOptions: { value: ApplicantsJobStatusFilter; label: string }[] = [

  { value: 'all', label: 'Všetky' },

  { value: 'published', label: 'Zverejnené' },

  { value: 'draft', label: 'Koncept' },

  { value: 'paused', label: 'Pozastavené' },

  { value: 'expired', label: 'Expirované' },

  { value: 'archived', label: 'Archivované' },

]



const sortOptions: { value: ApplicantsJobsSort; label: string }[] = [

  { value: 'last_application_desc', label: 'Najnovšie prihlášky' },

  { value: 'applicants_desc', label: 'Najviac uchádzačov' },

  { value: 'published_desc', label: 'Najnovšie zverejnené' },

  { value: 'expires_asc', label: 'Končiace čoskoro' },

]



const jobStatusDropdownLabel = computed(() => {

  const hit = jobStatusOptions.find((o) => o.value === jobStatus.value)

  return hit?.label ?? S.applicantsFilterJobStatus

})

const jobStatusTriggerMuted = computed(() => jobStatus.value === 'all')



const sortDropdownLabel = computed(() => {

  const hit = sortOptions.find((o) => o.value === sort.value)

  return hit?.label ?? S.applicantsFilterSort

})

const sortTriggerMuted = computed(() => sort.value === 'last_application_desc')



const hasActiveFilters = computed(

  () => search.value.trim() !== '' || jobStatus.value !== 'all' || hasNewOnly.value,

)



const emptyTitle = computed(() =>

  hadAnyJobs.value && jobs.value.length === 0

    ? S.applicantsNoJobsFilter

    : S.applicantsEmptyJobsTitle,

)

const emptyDescription = computed(() =>

  hadAnyJobs.value && jobs.value.length === 0 ? '' : S.applicantsEmptyJobsDescription,

)

const showCreateCta = computed(() => !hadAnyJobs.value && !loading.value)



function toggleDropdown(id: string): void {

  openDropdown.value = openDropdown.value === id ? null : id

}



function selectJobStatus(value: ApplicantsJobStatusFilter): void {

  jobStatus.value = value

  openDropdown.value = null

  void reload()

}



function selectSort(value: ApplicantsJobsSort): void {

  sort.value = value

  openDropdown.value = null

  void reload()

}



function onToggleHasNew(): void {

  hasNewOnly.value = !hasNewOnly.value

  openDropdown.value = null

  void reload()

}



provide(

  APPLICANTS_JOBS_FILTERS_KEY,

  buildApplicantsJobsFiltersUi({

    jobStatus,

    sort,

    hasNewOnly,

    openDropdown,

    toggleDropdown,

    selectJobStatus,

    selectSort,

    onToggleHasNew: onToggleHasNew,

    jobStatusOptions,

    jobStatusDropdownLabel,

    jobStatusTriggerMuted,

    sortOptions,

    sortDropdownLabel,

    sortTriggerMuted,

  }),

)



function domPathTouches(root: HTMLElement, path: readonly EventTarget[]): boolean {

  for (const p of path) {

    if (p instanceof Node && (p === root || root.contains(p))) {

      return true

    }

  }

  return false

}



function onDocClick(e: MouseEvent): void {

  const root = filtersBarRef.value?.shellRef

  if (root instanceof HTMLElement && !domPathTouches(root, e.composedPath())) {

    openDropdown.value = null

  }

}



function clearFilters(): void {

  search.value = ''

  jobStatus.value = 'all'

  hasNewOnly.value = false

  sort.value = 'last_application_desc'

  openDropdown.value = null

  void reload()

}



async function reload(): Promise<void> {

  clearFeedback()

  loading.value = true

  hubOffset.value = 0

  const data = await fetchJobsHub({

    q: search.value.trim() || undefined,

    job_status: jobStatus.value === 'all' ? undefined : jobStatus.value,

    has_new: hasNewOnly.value ? 'true' : undefined,

    sort: sort.value,

    limit: String(HUB_PAGE_SIZE),

    offset: '0',

  })

  jobs.value = data?.items ?? []

  hubTotal.value = data?.total ?? jobs.value.length

  if (!search.value && jobStatus.value === 'all' && !hasNewOnly.value && jobs.value.length > 0) {

    hadAnyJobs.value = true

  }

  loading.value = false

}



async function loadMoreHub(): Promise<void> {

  if (loadingMore.value || !hasMoreHub.value) return

  loadingMore.value = true

  hubOffset.value += HUB_PAGE_SIZE

  const data = await fetchJobsHub({

    q: search.value.trim() || undefined,

    job_status: jobStatus.value === 'all' ? undefined : jobStatus.value,

    has_new: hasNewOnly.value ? 'true' : undefined,

    sort: sort.value,

    limit: String(HUB_PAGE_SIZE),

    offset: String(hubOffset.value),

  })

  if (data?.items?.length) {

    jobs.value = [...jobs.value, ...data.items]

  }

  hubTotal.value = data?.total ?? hubTotal.value

  loadingMore.value = false

}



onMounted(() => {

  if (!user.value) {

    return

  }

  document.addEventListener('click', onDocClick)

  void reload()

})



onUnmounted(() => {

  document.removeEventListener('click', onDocClick)

})



useHead({ title: () => S.applicantsPageTitle })

</script>


