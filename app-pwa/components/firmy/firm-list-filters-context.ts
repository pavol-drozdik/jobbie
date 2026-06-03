import type { ComputedRef, InjectionKey, Ref } from 'vue'

import { reactive } from 'vue'

export interface FirmListFiltersUi {
  category: string
  locationFilter: string
  sort: 'relevance' | 'created_at'
  openDropdown: string | null
  toggleDropdown: (id: string) => void
  toggleCategory: (value: string) => void
  clearCategories: () => void
  isCategorySelected: (value: string) => boolean
  selectLocation: (value: string) => void
  selectSort: (value: 'relevance' | 'created_at') => void
  categoryOptions: { value: string; label: string }[]
  categoryMultiOptions: { value: string; label: string }[]
  categoryDropdownLabel: string
  categoryTriggerMuted: boolean
  sortOptions: { value: 'relevance' | 'created_at'; label: string }[]
  sortDropdownLabel: string
  sortTriggerMuted: boolean
}

export const FIRM_LIST_FILTERS_KEY: InjectionKey<FirmListFiltersUi> = Symbol('firmListFilters')

export function buildFirmListFiltersUi(input: {
  category: Ref<string>
  locationFilter: Ref<string>
  sort: Ref<'relevance' | 'created_at'>
  openDropdown: Ref<string | null>
  toggleDropdown: (id: string) => void
  toggleCategory: (value: string) => void
  clearCategories: () => void
  isCategorySelected: (value: string) => boolean
  selectLocation: (value: string) => void
  selectSort: (value: 'relevance' | 'created_at') => void
  categoryOptions: ComputedRef<{ value: string; label: string }[]>
  categoryMultiOptions: ComputedRef<{ value: string; label: string }[]>
  categoryDropdownLabel: ComputedRef<string>
  categoryTriggerMuted: ComputedRef<boolean>
  sortOptions: { value: 'relevance' | 'created_at'; label: string }[]
  sortDropdownLabel: ComputedRef<string>
  sortTriggerMuted: ComputedRef<boolean>
}): FirmListFiltersUi {
  return reactive({
    category: input.category,
    locationFilter: input.locationFilter,
    sort: input.sort,
    openDropdown: input.openDropdown,
    toggleDropdown: input.toggleDropdown,
    toggleCategory: input.toggleCategory,
    clearCategories: input.clearCategories,
    isCategorySelected: input.isCategorySelected,
    selectLocation: input.selectLocation,
    selectSort: input.selectSort,
    categoryOptions: input.categoryOptions,
    categoryMultiOptions: input.categoryMultiOptions,
    categoryDropdownLabel: input.categoryDropdownLabel,
    categoryTriggerMuted: input.categoryTriggerMuted,
    sortOptions: input.sortOptions,
    sortDropdownLabel: input.sortDropdownLabel,
    sortTriggerMuted: input.sortTriggerMuted,
  }) as FirmListFiltersUi
}
