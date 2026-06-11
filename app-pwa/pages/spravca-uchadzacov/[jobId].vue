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

    image-src="/home-design/feature-employer.webp"

    image-alt="Správa uchádzačov"

    :redirect-path="redirectPath"

  />

  <div v-else class="mx-auto w-full max-w-[1400px] box-border px-5 pb-10 font-dmSans text-black/80">

    <AppBackLink :to="ROUTES.applicants" :label="S.applicantsPageTitle" class="mt-6" />



    <ApplicantsListFiltersBar
      ref="filtersBarRef"
      :page-title="jobHeader?.title"
      :page-meta="jobHeader?.meta"
      :job-id="jobId"
      :search="search"
      :active-tab="activeTab"
      :status-counts="statusCounts"
      :has-active-filters="hasActiveFilters"
      :exporting="exportingInterviewExcel"
      @update:search="search = $event"
      @update:active-tab="activeTab = $event"
      @submit="reload"
      @clear="clearFilters"
      @export="exportInterviewList()"
      @mobile-panel-close="openDropdown = null"
    />

    <p v-if="feedback" class="mt-4 text-sm font-semibold text-marketing-green">{{ feedback }}</p>

    <p v-if="statusError" class="mt-4 text-sm text-red-700">{{ statusError }}</p>



    <div
      v-if="selectedIds.size > 0"
      class="sticky top-2 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-marketing-panel px-4 py-3 shadow-md"
    >
      <AppCheckbox
        :model-value="bulkBarAllSelected"
        :indeterminate="bulkBarIndeterminate"
        :aria-label="S.applicantsColSelectAll"
        @update:model-value="toggleSelectAll"
      />
      <span class="text-sm font-semibold">{{ selectedIds.size }} vybraných</span>
      <StatusDropdown class="w-full basis-full marketing:w-auto marketing:basis-auto" @change="onBulkStatusChange" />
      <AppButton
        size="md"
        variant="outline"
        :disabled="exportingExcel"
        @click="exportSelectedExcel"
      >
        {{ exportingExcel ? S.applicantsBulkExportExcelLoading : S.applicantsBulkExportExcel }}
      </AppButton>
      <AppButton
        size="md"
        variant="outline"
        :disabled="downloadingCvsZip || selectedWithCvCount === 0"
        @click="downloadSelectedCvs"
      >
        {{ downloadingCvsZip ? S.applicantsBulkDownloadCvsLoading : S.applicantsBulkDownloadCvs }}
      </AppButton>
      <AppButton size="md" variant="ghost" @click="clearSelection">
        {{ S.applicantsClearSelection }}
      </AppButton>
      <NuxtLink
        :to="ROUTES.settingsFirmaAutoReplies"
        class="ml-auto font-dmSans text-xs font-semibold text-marketing-green no-underline hover:underline"
      >
        {{ S.applicantsAutoRepliesLink }}
      </NuxtLink>
    </div>



    <div class="mt-6">

      <ApplicantsList

        :rows="applicants"

        :loading="listLoading"
        :status-updating-ids="statusUpdatingIds"

        :selected-ids="selectedIds"

        :empty-message="search || activeTab !== 'all' ? S.applicantsEmptyFilter : S.applicantsEmptyList"

        @toggle-select="toggleSelect"

        @toggle-select-all="toggleSelectAll"

        @open-profile="openApplicantProfile"
        @open-note="openNote"

        @invite="(row) => cardStatusChange(row, 'interview_invited')"

        @status-change="cardStatusChange"
        @download-error="onCvDownloadError"
      />

      <div v-if="hasMoreApplicants && !listLoading" class="mt-6 flex justify-center">
        <AppButton
          variant="secondary"
          size="md"
          :disabled="loadingMore"
          @click="loadMoreApplicants"
        >
          {{ loadingMore ? S.loading : 'Načítať ďalších uchádzačov' }}
        </AppButton>
      </div>

    </div>



    <ApplicantNoteModal
      :open="noteOpen"
      :application-id="noteAppId"
      @close="noteOpen = false"
      @saved="onApplicantNoteSaved"
    />

    <CvCandidateDetailModal
      v-model:open="profileCvOpen"
      :cv-id="profileCvId"
    />

    <ApplicantAutoReplyConfirm
      :open="autoReplyOpen"
      :title="autoReplyTitle"
      :message="autoReplyMessage"
      :preview="autoReplyPreview"
      @cancel="onCancelAutoReply"

      @move-without="onConfirmAutoReply(false)"

      @move-and-send="onConfirmAutoReply(true)"

    />

  </div>

</template>



<script setup lang="ts">

import { ROUTES } from '~/utils/app-routes'

import { S } from '~/utils/strings'

import { JOB_LISTING_STATUS_LABELS } from '~/utils/job-listing-status'

import type { ApplicationStatus } from '~/utils/applicant-status'

import type { EmployerApplicantRow, ApplicantStatusCounts } from '~/types/employer-applicants'


import ApplicantNoteModal from '~/components/applicants/ApplicantNoteModal.vue'
import ApplicantAutoReplyConfirm from '~/components/applicants/ApplicantAutoReplyConfirm.vue'
import CvCandidateDetailModal from '~/components/cv-database/CvCandidateDetailModal.vue'

import StatusDropdown from '~/components/applicants/StatusDropdown.vue'

import ApplicantsList from '~/components/applicants/ApplicantsList.vue'

import ApplicantsListFiltersBar from '~/components/applicants/ApplicantsListFiltersBar.vue'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'
import { getJobCardWorkModeLabel, getJobTypeLabel } from '~/utils/job'
import { limitApplicantBulkIds } from '~/composables/useApplicantStatusAction'
import { APPLICANT_CVS_ZIP_MAX } from '~/composables/useEmployerApplicants'
import {
  applyApplicantStatusLocally,
  snapshotApplicantStatuses,
  withNewStatus,
} from '~/utils/applicant-list-local-update'
import type { EmployerSettableStatus } from '~/utils/applicant-status'

import {

  APPLICANTS_LIST_FILTERS_KEY,

  buildApplicantsListFiltersUi,

  type ApplicantsListSort,

} from '~/components/applicants/applicants-list-filters-context'



definePageMeta({ layout: 'app', middleware: ['customer-only'] })



const route = useRoute()

const redirectPath = computed(() => route.fullPath || ROUTES.applicants)

const { user, loading: authLoading } = useAuth()

const jobId = computed(() => String(route.params.jobId))



const {

  fetchApplicants,

  fetchJobsHub,

  feedback,

  error: statusError,

  clearFeedback,

  downloadApplicantsExcel,

  downloadApplicantsCvsZip,

} = useEmployerApplicants()

const exportingExcel = ref(false)
const exportingInterviewExcel = ref(false)

const downloadingCvsZip = ref(false)

const {

  autoReplyOpen,

  autoReplyTitle,

  autoReplyMessage,

  autoReplyPreview,

  requestStatusChange,

  confirmAutoReply,

  closeAutoReply,

} = useApplicantStatusAction(jobId)



const search = ref('')

const sort = ref<ApplicantsListSort>('applied_at_desc')

const activeTab = ref<string>('all')

const applicants = ref<EmployerApplicantRow[]>([])

const statusCounts = ref<ApplicantStatusCounts | null>(null)

const loading = ref(true)

const loadingMore = ref(false)

const applicantsOffset = ref(0)

const applicantsTotal = ref(0)

const APPLICANTS_PAGE_SIZE = 50

const hasMoreApplicants = computed(() => applicants.value.length < applicantsTotal.value)
const statusUpdatingIds = ref(new Set<string>())

const listLoading = computed(() => loading.value && applicants.value.length === 0)

const jobHeader = ref<{ title: string; meta: string } | null>(null)

const selectedIds = ref(new Set<string>())

const profileCvOpen = ref(false)
const profileCvId = ref<string | null>(null)
const noteOpen = ref(false)
const noteAppId = ref<string | null>(null)

const openDropdown = ref<string | null>(null)

const filtersBarRef = ref<{ shellRef: HTMLElement | null; mobileOpen: boolean } | null>(null)



const sortOptions: { value: ApplicantsListSort; label: string }[] = [

  { value: 'applied_at_desc', label: 'Najnovší uchádzači' },

  { value: 'applied_at_asc', label: 'Najstarší uchádzači' },

  { value: 'experience_desc', label: 'Najviac skúseností' },

  { value: 'salary_asc', label: 'Najnižšie očakávanie platu' },

  { value: 'name_asc', label: 'Podľa mena' },

]



const sortDropdownLabel = computed(() => {

  const hit = sortOptions.find((o) => o.value === sort.value)

  return hit?.label ?? S.applicantsFilterSort

})

const sortTriggerMuted = computed(() => sort.value === 'applied_at_desc')



const hasActiveFilters = computed(

  () => search.value.trim() !== '' || activeTab.value !== 'all',

)

const bulkBarAllSelected = computed(() => {
  const onPage = applicants.value.map((a) => a.application_id)
  return onPage.length > 0 && onPage.every((id) => selectedIds.value.has(id))
})

const bulkBarIndeterminate = computed(() => {
  const onPage = applicants.value.map((a) => a.application_id)
  const any = onPage.some((id) => selectedIds.value.has(id))
  return any && !bulkBarAllSelected.value
})

const selectedWithCvCount = computed(() => {
  const set = selectedIds.value
  return applicants.value.filter((a) => set.has(a.application_id) && a.cv_id).length
})



function toggleDropdown(id: string): void {

  openDropdown.value = openDropdown.value === id ? null : id

}



function selectSort(value: ApplicantsListSort): void {

  sort.value = value

  openDropdown.value = null

  void reload()

}



provide(

  APPLICANTS_LIST_FILTERS_KEY,

  buildApplicantsListFiltersUi({

    sort,

    openDropdown,

    toggleDropdown,

    selectSort,

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

  activeTab.value = 'all'

  sort.value = 'applied_at_desc'

  openDropdown.value = null

  void reload()

}



function listingLabel(status: string): string {

  const key = status as keyof typeof JOB_LISTING_STATUS_LABELS

  return JOB_LISTING_STATUS_LABELS[key] ?? status

}



async function loadJobHeader(): Promise<void> {

  const hub = await fetchJobsHub({ limit: '50', offset: '0' })

  const job = hub?.items.find((j) => j.id === jobId.value)

  if (job) {

    jobHeader.value = {

      title: job.title,

      meta: [
        listingLabel(job.listing_status),
        job.location,
        job.job_type ? getJobTypeLabel(job.job_type) : null,
        getJobCardWorkModeLabel(job) || null,
      ]
        .filter(Boolean)
        .join(' · '),

    }

  }

}



async function reload(opts?: { clearSelection?: boolean }): Promise<void> {
  if (opts?.clearSelection !== false) {
    selectedIds.value = new Set()
  }
  const showSkeleton = applicants.value.length === 0
  if (showSkeleton) {
    loading.value = true
  }
  applicantsOffset.value = 0

  const data = await fetchApplicants(jobId.value, {

    status: activeTab.value,

    q: search.value.trim(),

    sort: sort.value,

    limit: String(APPLICANTS_PAGE_SIZE),

    offset: '0',

    has_cv: 'any',

  })

  applicants.value = data?.items ?? []

  applicantsTotal.value = data?.total ?? applicants.value.length

  statusCounts.value = data?.status_counts ?? null

  loading.value = false
}

async function loadMoreApplicants(): Promise<void> {
  if (loadingMore.value || !hasMoreApplicants.value) return
  loadingMore.value = true
  applicantsOffset.value += APPLICANTS_PAGE_SIZE
  const data = await fetchApplicants(jobId.value, {
    status: activeTab.value,
    q: search.value.trim(),
    sort: sort.value,
    limit: String(APPLICANTS_PAGE_SIZE),
    offset: String(applicantsOffset.value),
    has_cv: 'any',
  })
  if (data?.items?.length) {
    applicants.value = [...applicants.value, ...data.items]
  }
  applicantsTotal.value = data?.total ?? applicantsTotal.value
  loadingMore.value = false
}

function commitLocalStatusUpdates(
  applicationIds: string[],
  newStatus: EmployerSettableStatus,
): void {
  const snapshots = withNewStatus(
    snapshotApplicantStatuses(applicants.value, applicationIds),
    newStatus,
  )
  if (!snapshots.length) return
  const next = applyApplicantStatusLocally(
    applicants.value,
    statusCounts.value,
    snapshots,
    activeTab.value,
  )
  applicants.value = next.applicants
  statusCounts.value = next.statusCounts
}

function setStatusUpdating(ids: string[], updating: boolean): void {
  const next = new Set(statusUpdatingIds.value)
  for (const id of ids) {
    if (updating) next.add(id)
    else next.delete(id)
  }
  statusUpdatingIds.value = next
}

function toggleSelect(id: string): void {

  const next = new Set(selectedIds.value)

  if (next.has(id)) next.delete(id)

  else next.add(id)

  selectedIds.value = next

}



function toggleSelectAll(checked: boolean): void {
  const allOnPage = applicants.value.map((a) => a.application_id)
  const next = new Set(selectedIds.value)
  if (checked) {
    for (const id of allOnPage) next.add(id)
  } else {
    for (const id of allOnPage) next.delete(id)
  }
  selectedIds.value = next
}

function clearSelection(): void {
  selectedIds.value = new Set()
}

function onCvDownloadError(message: string): void {
  statusError.value = message
  feedback.value = null
}



function openApplicantProfile(row: EmployerApplicantRow): void {
  if (row.has_cv && row.cv_id) {
    profileCvId.value = row.cv_id
    profileCvOpen.value = true
    return
  }
  void navigateTo(ROUTES.publicProfile(row.individual_id))
}

function openNote(id: string): void {
  noteAppId.value = id
  noteOpen.value = true
}

function onApplicantNoteSaved(payload: { applicationId: string; note: string }): void {
  const trimmed = payload.note.trim()
  const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed
  applicants.value = applicants.value.map((row) =>
    row.application_id === payload.applicationId
      ? {
          ...row,
          has_note: trimmed.length > 0,
          note_preview: trimmed.length > 0 ? preview : null,
        }
      : row,
  )
  clearFeedback()
  feedback.value = 'Poznámka bola uložená.'
  noteOpen.value = false
}



async function applyStatusChange(
  ids: string[],
  status: EmployerSettableStatus,
): Promise<void> {
  const unique = [...new Set(ids)].filter(Boolean)
  if (!unique.length) return
  setStatusUpdating(unique, true)
  const outcome = await requestStatusChange(unique, status)
  if (outcome === 'done') {
    commitLocalStatusUpdates(unique, status)
    selectedIds.value = new Set()
    setStatusUpdating(unique, false)
  }
}

function onCancelAutoReply(): void {
  const ids = [...statusUpdatingIds.value]
  closeAutoReply()
  setStatusUpdating(ids, false)
}

async function cardStatusChange(
  row: EmployerApplicantRow,
  status: ApplicationStatus,
): Promise<void> {
  if (status === row.status) return
  await applyStatusChange([row.application_id], status as EmployerSettableStatus)
}



async function onBulkStatusChange(status: ApplicationStatus): Promise<void> {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  await applyStatusChange(ids, status as EmployerSettableStatus)
}



async function onConfirmAutoReply(send: boolean): Promise<void> {
  const result = await confirmAutoReply(send)
  if (result.ok && result.status) {
    commitLocalStatusUpdates(result.ids, result.status)
    selectedIds.value = new Set()
  }
  setStatusUpdating(result.ids, false)
}



function applicantExportQuery(): Record<string, string> {
  const out: Record<string, string> = {
    status: activeTab.value,
    sort: sort.value,
    has_cv: 'any',
  }
  const q = search.value.trim()
  if (q) out.q = q
  return out
}

/** Print / interview export — only applicants invited to interview. */
function interviewListExportQuery(): Record<string, string> {
  const out: Record<string, string> = {
    status: 'interview_invited',
    sort: sort.value,
    has_cv: 'any',
  }
  const q = search.value.trim()
  if (q) out.q = q
  return out
}

function goPrint(opts?: { selectionOnly?: boolean }): void {
  const params = new URLSearchParams(interviewListExportQuery())
  if (opts?.selectionOnly && selectedIds.value.size > 0) {
    params.set('ids', [...selectedIds.value].join(','))
  }
  navigateTo(`${ROUTES.applicantsPrint(jobId.value)}?${params.toString()}`)
}

async function exportInterviewList(): Promise<void> {
  clearFeedback()
  exportingInterviewExcel.value = true
  const ok = await downloadApplicantsExcel(jobId.value, interviewListExportQuery())
  exportingInterviewExcel.value = false
  if (ok) goPrint()
}



async function exportSelectedExcel(): Promise<void> {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  clearFeedback()
  exportingExcel.value = true
  const { ids: limited, truncated } = limitApplicantBulkIds(ids)
  await downloadApplicantsExcel(jobId.value, applicantExportQuery(), limited)
  if (truncated) {
    statusError.value = S.applicantsBulkLimitWarning
  }
  exportingExcel.value = false
}

async function downloadSelectedCvs(): Promise<void> {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  const withCvIds = applicants.value
    .filter((a) => ids.includes(a.application_id) && a.cv_id)
    .map((a) => a.application_id)
  if (!withCvIds.length) {
    statusError.value = 'Vybraní uchádzači nemajú dostupný životopis.'
    return
  }
  if (withCvIds.length > APPLICANT_CVS_ZIP_MAX) {
    statusError.value = `Naraz je možné stiahnuť najviac ${APPLICANT_CVS_ZIP_MAX} životopisov.`
    return
  }
  clearFeedback()
  downloadingCvsZip.value = true
  await downloadApplicantsCvsZip(jobId.value, applicantExportQuery(), withCvIds)
  downloadingCvsZip.value = false
}



onMounted(async () => {

  if (!user.value) {

    return

  }

  document.addEventListener('click', onDocClick)

  await loadJobHeader()

  await reload()

})



onUnmounted(() => {

  document.removeEventListener('click', onDocClick)

})



useHead({

  title: () =>

    jobHeader.value

      ? `${jobHeader.value.title} — ${S.applicantsPageTitle}`

      : S.applicantsPageTitle,

})

</script>


