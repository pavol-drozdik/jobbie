import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { reactive, ref } from 'vue'
import type {
  CvDatabaseFiltersModel,
  CvDbAvailability,
  CvDbEducationLevel,
  CvDbExperienceRange,
} from '~/types/employer-cv-database'
import type { SalaryTypeFilterValue } from '~/utils/job-post-options'

export type ListFiltersGridVariant = 'jobs' | 'cv-database'

export interface FindListFiltersState {
  search: string
  category: string
  urgent_only: boolean
  date_range: 'all' | 'today' | 'week' | 'month'
  location: string
  min_hourly_wage: string
  max_hourly_wage: string
  job_type: string
  sort: 'relevance' | 'created_at' | 'compensation_amount'
  skills: string
  /** Empty string = all; otherwise a `CATALOG_SALARY_FILTER_TYPES` value */
  salary_type: string
  salary_min: string
  salary_max: string
  featured_only: boolean
  work_mode: string
  radius: string
}

/** Reactive UI bundle for list filter pill grids (jobs catalog, CV database). */
export interface FindListFiltersUi {
  gridVariant: ListFiltersGridVariant
  /** Set when `gridVariant === 'cv-database'`. */
  cvFilters?: Ref<CvDatabaseFiltersModel>
  filters: FindListFiltersState
  tierSilverActive: boolean
  tierBronzeActive: boolean
  openDropdown: string | null
  toggleDropdown: (id: string) => void
  toggleFeaturedTier: () => void
  toggleUrgent: () => void
  toggleTierSilver: () => void
  toggleTierBronze: () => void
  selectDateRange: (value: FindListFiltersState['date_range']) => void
  toggleCategory: (value: string) => void
  clearCategories: () => void
  isCategorySelected: (value: string) => boolean
  locationFilterKind?: ComputedRef<'municipality' | 'country'> | 'municipality' | 'country'
  locationFilterOptions?: ComputedRef<{ value: string; label: string }[]>
  selectLocation: (value: string) => void
  selectSalaryTypeFilter: (value: SalaryTypeFilterValue) => void
  selectJobType: (value: string) => void
  selectSort: (value: string) => void
  debouncedFetchNumbers: () => void
  flushDebouncedNumericFilters: () => void
  selectExperience?: (value: CvDbExperienceRange) => void
  experienceOptions?: { value: CvDbExperienceRange; label: string }[]
  experienceDropdownLabel?: string
  experienceTriggerMuted?: boolean
  selectAvailability?: (value: CvDbAvailability) => void
  availabilityOptions?: { value: CvDbAvailability; label: string }[]
  availabilityDropdownLabel?: string
  availabilityTriggerMuted?: boolean
  patchCvSalaryMax?: (value: string) => void
  cvSalaryDropdownLabel?: string
  cvSalaryTriggerMuted?: boolean
  patchCvSkills?: (skills: string[]) => void
  clearCvSkills?: () => void
  skillsDropdownLabel?: string
  skillsTriggerMuted?: boolean
  languageMultiOptions?: { value: string; label: string }[]
  toggleLanguage?: (value: string) => void
  isLanguageSelected?: (value: string) => boolean
  languageLevelOptions?: { value: string; label: string }[]
  sharedLanguageMinLevel?: string
  selectLanguageMinLevel?: (value: string) => void
  clearCvLanguages?: () => void
  languagesDropdownLabel?: string
  languagesTriggerMuted?: boolean
  selectEducation?: (value: CvDbEducationLevel) => void
  educationOptions?: { value: CvDbEducationLevel; label: string }[]
  educationDropdownLabel?: string
  educationTriggerMuted?: boolean
  dateOptions: { value: FindListFiltersState['date_range']; label: string }[]
  dateDropdownLabel: string
  dateTriggerMuted: boolean
  categoryOptions: { value: string; label: string }[]
  categoryMultiOptions: { value: string; label: string }[]
  categoryDropdownLabel: string
  categoryTriggerMuted: boolean
  payTypeOptions: { value: SalaryTypeFilterValue; label: string }[]
  payDropdownLabel: string
  payTriggerMuted: boolean
  showPayPlatInput: boolean
  payMinPlaceholder: string
  jobTypeOptions: { value: string; label: string }[]
  jobTypeDropdownLabel: string
  jobTypeTriggerMuted: boolean
  sortOptions: { value: string; label: string }[]
  sortDropdownLabel: string
  sortTriggerMuted: boolean
}

export const FIND_LIST_FILTERS_KEY: InjectionKey<FindListFiltersUi> = Symbol('findListFilters')

/** Build reactive provide value (call after refs/computeds exist). */
// tierSilver/Bronze toggles map to featured_only / listing tier query params in find.vue (not 1:1 with DB enum names).
export function buildFindListFiltersUi(input: {
  gridVariant?: ListFiltersGridVariant
  cvFilters?: Ref<CvDatabaseFiltersModel>
  filters: Ref<FindListFiltersState>
  tierSilverActive?: Ref<boolean>
  tierBronzeActive?: Ref<boolean>
  openDropdown: Ref<string | null>
  toggleDropdown: (id: string) => void
  toggleFeaturedTier: () => void
  toggleUrgent: () => void
  selectDateRange: (value: FindListFiltersState['date_range']) => void
  toggleCategory: (value: string) => void
  clearCategories: () => void
  isCategorySelected: (value: string) => boolean
  locationFilterKind?: ComputedRef<'municipality' | 'country'> | 'municipality' | 'country'
  locationFilterOptions?: ComputedRef<{ value: string; label: string }[]>
  selectLocation: (value: string) => void
  selectSalaryTypeFilter: (value: SalaryTypeFilterValue) => void
  selectJobType: (value: string) => void
  selectSort: (value: string) => void
  debouncedFetchNumbers: () => void
  flushDebouncedNumericFilters: () => void
  selectExperience?: (value: CvDbExperienceRange) => void
  experienceOptions?: { value: CvDbExperienceRange; label: string }[]
  experienceDropdownLabel?: ComputedRef<string>
  experienceTriggerMuted?: ComputedRef<boolean>
  selectAvailability?: (value: CvDbAvailability) => void
  availabilityOptions?: { value: CvDbAvailability; label: string }[]
  availabilityDropdownLabel?: ComputedRef<string>
  availabilityTriggerMuted?: ComputedRef<boolean>
  patchCvSalaryMax?: (value: string) => void
  cvSalaryDropdownLabel?: ComputedRef<string>
  cvSalaryTriggerMuted?: ComputedRef<boolean>
  patchCvSkills?: (skills: string[]) => void
  clearCvSkills?: () => void
  skillsDropdownLabel?: ComputedRef<string>
  skillsTriggerMuted?: ComputedRef<boolean>
  languageMultiOptions?: ComputedRef<{ value: string; label: string }[]>
  toggleLanguage?: (value: string) => void
  isLanguageSelected?: (value: string) => boolean
  languageLevelOptions?: { value: string; label: string }[]
  sharedLanguageMinLevel?: ComputedRef<string>
  selectLanguageMinLevel?: (value: string) => void
  clearCvLanguages?: () => void
  languagesDropdownLabel?: ComputedRef<string>
  languagesTriggerMuted?: ComputedRef<boolean>
  selectEducation?: (value: CvDbEducationLevel) => void
  educationOptions?: { value: CvDbEducationLevel; label: string }[]
  educationDropdownLabel?: ComputedRef<string>
  educationTriggerMuted?: ComputedRef<boolean>
  dateOptions: { value: FindListFiltersState['date_range']; label: string }[]
  dateDropdownLabel: ComputedRef<string>
  dateTriggerMuted: ComputedRef<boolean>
  categoryOptions: ComputedRef<{ value: string; label: string }[]>
  categoryMultiOptions: ComputedRef<{ value: string; label: string }[]>
  categoryDropdownLabel: ComputedRef<string>
  categoryTriggerMuted: ComputedRef<boolean>
  payTypeOptions: { value: SalaryTypeFilterValue; label: string }[]
  payDropdownLabel: ComputedRef<string>
  payTriggerMuted: ComputedRef<boolean>
  showPayPlatInput: ComputedRef<boolean>
  payMinPlaceholder: ComputedRef<string>
  jobTypeOptions: { value: string; label: string }[]
  jobTypeDropdownLabel: ComputedRef<string>
  jobTypeTriggerMuted: ComputedRef<boolean>
  sortOptions: { value: string; label: string }[]
  sortDropdownLabel: ComputedRef<string>
  sortTriggerMuted: ComputedRef<boolean>
}): FindListFiltersUi {
  const tierSilver = input.tierSilverActive ?? ref(false)
  const tierBronze = input.tierBronzeActive ?? ref(false)
  return reactive({
    gridVariant: input.gridVariant ?? 'jobs',
    cvFilters: input.cvFilters,
    filters: input.filters,
    tierSilverActive: tierSilver,
    tierBronzeActive: tierBronze,
    openDropdown: input.openDropdown,
    toggleDropdown: input.toggleDropdown,
    toggleFeaturedTier: input.toggleFeaturedTier,
    toggleUrgent: input.toggleUrgent,
    toggleTierSilver: () => {
      tierSilver.value = !tierSilver.value
    },
    toggleTierBronze: () => {
      tierBronze.value = !tierBronze.value
    },
    selectDateRange: input.selectDateRange,
    toggleCategory: input.toggleCategory,
    clearCategories: input.clearCategories,
    isCategorySelected: input.isCategorySelected,
    locationFilterKind: input.locationFilterKind ?? 'municipality',
    locationFilterOptions: input.locationFilterOptions,
    selectLocation: input.selectLocation,
    selectSalaryTypeFilter: input.selectSalaryTypeFilter,
    selectJobType: input.selectJobType,
    selectSort: input.selectSort,
    debouncedFetchNumbers: input.debouncedFetchNumbers,
    flushDebouncedNumericFilters: input.flushDebouncedNumericFilters,
    dateOptions: input.dateOptions,
    dateDropdownLabel: input.dateDropdownLabel,
    dateTriggerMuted: input.dateTriggerMuted,
    categoryOptions: input.categoryOptions,
    categoryMultiOptions: input.categoryMultiOptions,
    categoryDropdownLabel: input.categoryDropdownLabel,
    categoryTriggerMuted: input.categoryTriggerMuted,
    payTypeOptions: input.payTypeOptions,
    payDropdownLabel: input.payDropdownLabel,
    payTriggerMuted: input.payTriggerMuted,
    showPayPlatInput: input.showPayPlatInput,
    payMinPlaceholder: input.payMinPlaceholder,
    jobTypeOptions: input.jobTypeOptions,
    jobTypeDropdownLabel: input.jobTypeDropdownLabel,
    jobTypeTriggerMuted: input.jobTypeTriggerMuted,
    sortOptions: input.sortOptions,
    sortDropdownLabel: input.sortDropdownLabel,
    sortTriggerMuted: input.sortTriggerMuted,
    selectExperience: input.selectExperience,
    experienceOptions: input.experienceOptions,
    experienceDropdownLabel: input.experienceDropdownLabel,
    experienceTriggerMuted: input.experienceTriggerMuted,
    selectAvailability: input.selectAvailability,
    availabilityOptions: input.availabilityOptions,
    availabilityDropdownLabel: input.availabilityDropdownLabel,
    availabilityTriggerMuted: input.availabilityTriggerMuted,
    patchCvSalaryMax: input.patchCvSalaryMax,
    cvSalaryDropdownLabel: input.cvSalaryDropdownLabel,
    cvSalaryTriggerMuted: input.cvSalaryTriggerMuted,
    patchCvSkills: input.patchCvSkills,
    clearCvSkills: input.clearCvSkills,
    skillsDropdownLabel: input.skillsDropdownLabel,
    skillsTriggerMuted: input.skillsTriggerMuted,
    languageMultiOptions: input.languageMultiOptions,
    toggleLanguage: input.toggleLanguage,
    isLanguageSelected: input.isLanguageSelected,
    languageLevelOptions: input.languageLevelOptions,
    sharedLanguageMinLevel: input.sharedLanguageMinLevel,
    selectLanguageMinLevel: input.selectLanguageMinLevel,
    clearCvLanguages: input.clearCvLanguages,
    languagesDropdownLabel: input.languagesDropdownLabel,
    languagesTriggerMuted: input.languagesTriggerMuted,
    selectEducation: input.selectEducation,
    educationOptions: input.educationOptions,
    educationDropdownLabel: input.educationDropdownLabel,
    educationTriggerMuted: input.educationTriggerMuted,
  }) as unknown as FindListFiltersUi
}
