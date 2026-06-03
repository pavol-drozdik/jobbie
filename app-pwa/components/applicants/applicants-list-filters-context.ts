import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { reactive } from 'vue'

export type ApplicantsListSort =
  | 'applied_at_desc'
  | 'applied_at_asc'
  | 'experience_desc'
  | 'salary_asc'
  | 'name_asc'

export interface ApplicantsListFiltersUi {
  sort: ApplicantsListSort
  openDropdown: string | null
  toggleDropdown: (id: string) => void
  selectSort: (value: ApplicantsListSort) => void
  sortOptions: { value: ApplicantsListSort; label: string }[]
  sortDropdownLabel: string
  sortTriggerMuted: boolean
}

export const APPLICANTS_LIST_FILTERS_KEY: InjectionKey<ApplicantsListFiltersUi> =
  Symbol('applicantsListFilters')

export function buildApplicantsListFiltersUi(input: {
  sort: Ref<ApplicantsListSort>
  openDropdown: Ref<string | null>
  toggleDropdown: (id: string) => void
  selectSort: (value: ApplicantsListSort) => void
  sortOptions: { value: ApplicantsListSort; label: string }[]
  sortDropdownLabel: ComputedRef<string>
  sortTriggerMuted: ComputedRef<boolean>
}): ApplicantsListFiltersUi {
  return reactive({
    sort: input.sort,
    openDropdown: input.openDropdown,
    toggleDropdown: input.toggleDropdown,
    selectSort: input.selectSort,
    sortOptions: input.sortOptions,
    sortDropdownLabel: input.sortDropdownLabel,
    sortTriggerMuted: input.sortTriggerMuted,
  }) as ApplicantsListFiltersUi
}
