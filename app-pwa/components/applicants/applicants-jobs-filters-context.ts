import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { reactive } from 'vue'

export type ApplicantsJobStatusFilter =
  | 'all'
  | 'published'
  | 'draft'
  | 'paused'
  | 'expired'
  | 'archived'

export type ApplicantsJobsSort =
  | 'last_application_desc'
  | 'applicants_desc'
  | 'published_desc'
  | 'expires_asc'

export interface ApplicantsJobsFiltersUi {
  jobStatus: ApplicantsJobStatusFilter
  sort: ApplicantsJobsSort
  hasNewOnly: boolean
  openDropdown: string | null
  toggleDropdown: (id: string) => void
  toggleHasNew: () => void
  selectJobStatus: (value: ApplicantsJobStatusFilter) => void
  selectSort: (value: ApplicantsJobsSort) => void
  jobStatusOptions: { value: ApplicantsJobStatusFilter; label: string }[]
  jobStatusDropdownLabel: string
  jobStatusTriggerMuted: boolean
  sortOptions: { value: ApplicantsJobsSort; label: string }[]
  sortDropdownLabel: string
  sortTriggerMuted: boolean
}

export const APPLICANTS_JOBS_FILTERS_KEY: InjectionKey<ApplicantsJobsFiltersUi> =
  Symbol('applicantsJobsFilters')

export function buildApplicantsJobsFiltersUi(input: {
  jobStatus: Ref<ApplicantsJobStatusFilter>
  sort: Ref<ApplicantsJobsSort>
  hasNewOnly: Ref<boolean>
  openDropdown: Ref<string | null>
  toggleDropdown: (id: string) => void
  selectJobStatus: (value: ApplicantsJobStatusFilter) => void
  selectSort: (value: ApplicantsJobsSort) => void
  onToggleHasNew: () => void
  jobStatusOptions: { value: ApplicantsJobStatusFilter; label: string }[]
  jobStatusDropdownLabel: ComputedRef<string>
  jobStatusTriggerMuted: ComputedRef<boolean>
  sortOptions: { value: ApplicantsJobsSort; label: string }[]
  sortDropdownLabel: ComputedRef<string>
  sortTriggerMuted: ComputedRef<boolean>
}): ApplicantsJobsFiltersUi {
  return reactive({
    jobStatus: input.jobStatus,
    sort: input.sort,
    hasNewOnly: input.hasNewOnly,
    openDropdown: input.openDropdown,
    toggleDropdown: input.toggleDropdown,
    toggleHasNew: input.onToggleHasNew,
    selectJobStatus: input.selectJobStatus,
    selectSort: input.selectSort,
    jobStatusOptions: input.jobStatusOptions,
    jobStatusDropdownLabel: input.jobStatusDropdownLabel,
    jobStatusTriggerMuted: input.jobStatusTriggerMuted,
    sortOptions: input.sortOptions,
    sortDropdownLabel: input.sortDropdownLabel,
    sortTriggerMuted: input.sortTriggerMuted,
  }) as ApplicantsJobsFiltersUi
}
