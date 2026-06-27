<script setup lang="ts">
// Employer CV search: filters sync to URL; unlock shows contact, contact opens chat.
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import ListMobileFiltersDropdown from '~/components/list/ListMobileFiltersDropdown.vue'
import FindFiltersDropdownGrid from '~/components/find/FindFiltersDropdownGrid.vue'
import {
  buildFindListFiltersUi,
  FIND_LIST_FILTERS_KEY,
  type FindListFiltersState,
} from '~/components/find/find-list-filters-context'
import { CV_DB_FILTER_LANGUAGE_OPTIONS } from '~/utils/cv-database-filter-options'
import { CV_BUILDER_LANGUAGE_LEVEL_OPTIONS } from '~/utils/cv-form-options'
import { joinCategorySelection, parseCategorySelection, toggleCategorySlug } from '~/utils/list-filter-category'
import CvCandidateCard from '~/components/cv-database/CvCandidateCard.vue'
import CvCandidateDetailModal from '~/components/cv-database/CvCandidateDetailModal.vue'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { catalogFilterHeroClass } from '~/utils/marketing-ui'
import type {
  CvDatabaseFiltersModel,
  CvDbAvailability,
  CvDbEducationLevel,
  CvDbExperienceRange,
  CvDbJobType,
  CvDbLanguageLevel,
  CvDbSort,
  CvEmployerOpenChatApplication,
  EmployerCvDatabaseListItem,
} from '~/types/employer-cv-database'
import { defaultCvDatabaseFilters, CV_DB_JOB_TYPES } from '~/types/employer-cv-database'
import {
  hasActiveFilters,
  parseCandidateFiltersFromQuery,
  serializeCandidateFiltersToQuery,
} from '~/utils/cv-database-query'
import { EMPLOYMENT_TYPES_FOR_CV_DB_FILTER } from '~/utils/employment-types'
import { employmentTypeLabel } from '~/utils/employment-types'
import { insufficientCreditsUserMessage } from '~/utils/api-errors'
import {
  BUY_CREDITS_PATH,
  CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE,
} from '~/utils/billing-errors'

const { fetchList, fetchDetail, postUnlockContact, postOpenChat } =
  useEmployerCvDatabase()

const route = useRoute()
const router = useRouter()

const shellRef = ref<HTMLElement | null>(null)
const filters = ref<CvDatabaseFiltersModel>(parseCandidateFiltersFromQuery(route.query))
const mobileFiltersOpen = ref(false)
const openDropdown = ref<string | null>(null)
const filtersActive = computed(() => hasActiveFilters(filters.value))

const page = ref(1)
const limit = 20

const listLoading = ref(false)
const listError = ref<string | null>(null)
const items = ref<EmployerCvDatabaseListItem[]>([])
const total = ref(0)
const totalIsPartial = ref(false)

const detailOpen = ref(false)
const detailCvId = ref<string | null>(null)
const initialChatApplications = ref<CvEmployerOpenChatApplication[] | null>(null)
const contactBusyCvId = ref<string | null>(null)
const unlockBusyCvId = ref<string | null>(null)
const contactError = ref<string | null>(null)
const contactErrorIsCredits = ref(false)

const offset = computed(() => (page.value - 1) * limit)

function clearAll(): void {
  filters.value = defaultCvDatabaseFilters()
  page.value = 1
  mobileFiltersOpen.value = false
}

function patchFilters(partial: Partial<CvDatabaseFiltersModel>): void {
  filters.value = { ...filters.value, ...partial }
}

function toggleDropdown(id: string): void {
  openDropdown.value = openDropdown.value === id ? null : id
}

function jobTypesAsCategoryField(): string {
  return joinCategorySelection(filters.value.jobTypes)
}

function toggleCategory(value: string): void {
  const next = toggleCategorySlug(jobTypesAsCategoryField(), value)
  const types = parseCategorySelection(next).filter((v): v is CvDbJobType =>
    (CV_DB_JOB_TYPES as readonly string[]).includes(v),
  )
  patchFilters({ jobTypes: types })
}

function clearCategories(): void {
  patchFilters({ jobTypes: [] })
  openDropdown.value = null
}

function isCategorySelected(value: string): boolean {
  return filters.value.jobTypes.includes(value as CvDbJobType)
}

function selectExperience(value: CvDbExperienceRange): void {
  filters.value = { ...filters.value, experience: value }
  openDropdown.value = null
}

function selectAvailability(value: CvDbAvailability): void {
  filters.value = { ...filters.value, availability: value }
  openDropdown.value = null
}

function selectEducation(value: CvDbEducationLevel): void {
  patchFilters({ educationLevel: value })
  openDropdown.value = null
}

function selectSort(value: CvDbSort): void {
  filters.value = { ...filters.value, sort: value }
  openDropdown.value = null
}

function filterNameNorm(value: string): string {
  return value.trim().toLocaleLowerCase('sk-SK')
}

function patchCvSkills(skills: string[]): void {
  patchFilters({ skills })
}

function clearCvSkills(): void {
  patchFilters({ skills: [] })
  openDropdown.value = null
}

function isLanguageSelected(value: string): boolean {
  const n = filterNameNorm(value)
  return filters.value.languages.some((l) => filterNameNorm(l) === n)
}

function toggleLanguage(value: string): void {
  const n = filterNameNorm(value)
  const current = filters.value.languages
  const hit = current.findIndex((l) => filterNameNorm(l) === n)
  if (hit >= 0) {
    const removed = current[hit]!
    const levels = { ...filters.value.languageLevels }
    delete levels[filterNameNorm(removed)]
    patchFilters({
      languages: current.filter((_, i) => i !== hit),
      languageLevels: levels,
    })
    return
  }
  const levels = { ...filters.value.languageLevels }
  const shared = sharedLanguageMinLevel.value
  if (shared) levels[n] = shared as CvDbLanguageLevel
  patchFilters({ languages: [...current, value], languageLevels: levels })
}

function selectLanguageMinLevel(value: string): void {
  const langs = filters.value.languages
  if (!langs.length) return
  const levels: Partial<Record<string, CvDbLanguageLevel>> = {}
  if (value) {
    for (const lang of langs) {
      levels[filterNameNorm(lang)] = value as CvDbLanguageLevel
    }
  }
  patchFilters({ languageLevels: levels })
}

function clearCvLanguages(): void {
  patchFilters({ languages: [], languageLevels: {} })
  openDropdown.value = null
}

const languageMultiOptions = computed(() => {
  const seen = new Set<string>()
  const out: { value: string; label: string }[] = []
  const add = (label: string): void => {
    const key = filterNameNorm(label)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push({ value: label, label })
  }
  for (const opt of CV_DB_FILTER_LANGUAGE_OPTIONS) add(opt.label)
  for (const lang of filters.value.languages) add(lang)
  return out.sort((a, b) => a.label.localeCompare(b.label, 'sk'))
})

const languageLevelOptions: { value: string; label: string }[] = [
  { value: '', label: S.cvDbLangLevelAny },
  ...CV_BUILDER_LANGUAGE_LEVEL_OPTIONS.filter((o) => o.value !== ''),
]

const sharedLanguageMinLevel = computed((): string => {
  const langs = filters.value.languages
  if (!langs.length) return ''
  const levels = langs.map((l) => filters.value.languageLevels[filterNameNorm(l)] ?? '')
  const first = levels[0] ?? ''
  if (!first) return ''
  return levels.every((lvl) => lvl === first) ? first : ''
})

const jobTypeOptions = EMPLOYMENT_TYPES_FOR_CV_DB_FILTER.map((o) => ({
  value: o.value as CvDbJobType,
  label: o.label,
}))

const experienceOptions: { value: CvDbExperienceRange; label: string }[] = [
  { value: '', label: S.cvDbExpAny },
  { value: 'none', label: S.cvDbExpNone },
  { value: 'lt1', label: S.cvDbExpLt1 },
  { value: '1_2', label: S.cvDbExp12 },
  { value: '3_5', label: S.cvDbExp35 },
  { value: '6_10', label: S.cvDbExp610 },
  { value: '10p', label: S.cvDbExp10p },
]

const availabilityOptions: { value: CvDbAvailability; label: string }[] = [
  { value: '', label: S.cvDbAvailAny },
  { value: 'immediately', label: S.cvDbAvailImmediate },
  { value: 'by_agreement', label: S.cvDbAvailAgreement },
  { value: 'within_1_month', label: S.cvDbAvailWithin1 },
  { value: 'within_2_months', label: S.cvDbAvailWithin2 },
  { value: 'within_3_months', label: S.cvDbAvailWithin3 },
]

const educationOptions: { value: CvDbEducationLevel; label: string }[] = [
  { value: '', label: S.cvDbExpAny },
  { value: 'basic', label: S.cvDbEduBasic },
  { value: 'secondary', label: S.cvDbEduSecondary },
  { value: 'secondary_with_graduation', label: S.cvDbEduSecondaryGrad },
  { value: 'university_bc', label: S.cvDbEduBc },
  { value: 'university_mgr', label: S.cvDbEduMgr },
  { value: 'university_phd', label: S.cvDbEduPhd },
  { value: 'course', label: S.cvDbEduCourse },
]

const sortOptions: { value: CvDbSort; label: string }[] = [
  { value: 'best_match', label: S.cvDbSortBestMatch },
  { value: 'last_active', label: S.cvDbSortLastActive },
  { value: 'last_updated', label: S.cvDbSortLastUpdated },
  { value: 'salary_asc', label: S.cvDbSortSalaryAsc },
  { value: 'experience_desc', label: S.cvDbSortExperienceDesc },
]

const categoryMultiOptions = jobTypeOptions

const categoryDropdownLabel = computed(() => {
  if (!filters.value.jobTypes.length) return S.cvDbJobTypeAny
  return filters.value.jobTypes
    .map((v) => employmentTypeLabel(v) || v)
    .join(', ')
})
const categoryTriggerMuted = computed(() => filters.value.jobTypes.length === 0)

const experienceDropdownLabel = computed(() => {
  const hit = experienceOptions.find((o) => o.value === filters.value.experience)
  return hit?.label ?? S.cvDbExpAny
})
const experienceTriggerMuted = computed(() => !filters.value.experience)

const availabilityDropdownLabel = computed(() => {
  const hit = availabilityOptions.find((o) => o.value === filters.value.availability)
  return hit?.label ?? S.cvDbAvailAny
})
const availabilityTriggerMuted = computed(() => !filters.value.availability)

const educationDropdownLabel = computed(() => {
  const hit = educationOptions.find((o) => o.value === filters.value.educationLevel)
  return hit?.label ?? S.cvDbExpAny
})
const educationTriggerMuted = computed(() => !filters.value.educationLevel)

const skillsDropdownLabel = computed(() => {
  const n = filters.value.skills.length
  if (n === 0) return S.cvDbSkillsAny
  if (n === 1) return filters.value.skills[0]!
  return `${n} ${S.cvDbBasicSkills.toLowerCase()}`
})
const skillsTriggerMuted = computed(() => filters.value.skills.length === 0)

const languagesDropdownLabel = computed(() => {
  const langs = filters.value.languages
  if (!langs.length) return S.cvDbLanguagesAny
  if (langs.length === 1) {
    const lang = langs[0]!
    const lvl = filters.value.languageLevels[lang.toLowerCase()]
    return lvl ? `${lang} · ${lvl}` : lang
  }
  return `${langs.length} ${S.cvDbAdvSecLanguages.toLowerCase()}`
})
const languagesTriggerMuted = computed(() => filters.value.languages.length === 0)

function selectLocation(value: string): void {
  patchFilters({
    location: value,
    radius: value.trim() ? filters.value.radius : '',
  })
}

const cvSalaryDropdownLabel = computed(() => {
  if (!filters.value.salaryMax) return S.cvDbBasicSalaryMaxPh
  return `${filters.value.salaryMax} €`
})
const cvSalaryTriggerMuted = computed(() => !filters.value.salaryMax)

function patchCvSalaryMax(value: string): void {
  patchFilters({ salaryMax: value })
}

const sortDropdownLabel = computed(() => {
  const hit = sortOptions.find((o) => o.value === filters.value.sort)
  return hit?.label ?? S.cvDbSortBestMatch
})
const sortTriggerMuted = computed(() => filters.value.sort === 'best_match')

const findFiltersStub = ref<FindListFiltersState>({
  search: '',
  category: 'all',
  urgent_only: false,
  date_range: 'all',
  location: '',
  min_hourly_wage: '',
  max_hourly_wage: '',
  job_type: 'all',
  sort: 'relevance',
  skills: '',
  salary_type: '',
  salary_min: '',
  salary_max: '',
  featured_only: false,
  work_mode: '',
  radius: '',
})

provide(
  FIND_LIST_FILTERS_KEY,
  buildFindListFiltersUi({
    gridVariant: 'cv-database',
    cvFilters: filters,
    filters: findFiltersStub,
    openDropdown,
    toggleDropdown,
    toggleFeaturedTier: () => {},
    toggleUrgent: () => {},
    selectDateRange: () => {},
    toggleCategory,
    clearCategories,
    isCategorySelected,
    selectLocation,
    selectSalaryTypeFilter: () => {},
    selectJobType: () => {},
    selectSort: (value) => selectSort(value as CvDbSort),
    debouncedFetchNumbers: () => {},
    flushDebouncedNumericFilters: () => {},
    dateOptions: [],
    dateDropdownLabel: computed(() => ''),
    dateTriggerMuted: computed(() => true),
    categoryOptions: computed(() => []),
    categoryMultiOptions: computed(() => categoryMultiOptions),
    categoryDropdownLabel,
    categoryTriggerMuted,
    payTypeOptions: [],
    payDropdownLabel: computed(() => ''),
    payTriggerMuted: computed(() => true),
    showPayPlatInput: computed(() => false),
    payMinPlaceholder: computed(() => ''),
    jobTypeOptions: [],
    jobTypeDropdownLabel: computed(() => ''),
    jobTypeTriggerMuted: computed(() => true),
    sortOptions,
    sortDropdownLabel,
    sortTriggerMuted,
    selectExperience,
    experienceOptions,
    experienceDropdownLabel,
    experienceTriggerMuted,
    selectAvailability,
    availabilityOptions,
    availabilityDropdownLabel,
    availabilityTriggerMuted,
    patchCvSalaryMax,
    cvSalaryDropdownLabel,
    cvSalaryTriggerMuted,
    patchCvSkills,
    clearCvSkills,
    skillsDropdownLabel,
    skillsTriggerMuted,
    languageMultiOptions,
    toggleLanguage,
    isLanguageSelected,
    languageLevelOptions,
    sharedLanguageMinLevel,
    selectLanguageMinLevel,
    clearCvLanguages,
    languagesDropdownLabel,
    languagesTriggerMuted,
    selectEducation,
    educationOptions,
    educationDropdownLabel,
    educationTriggerMuted,
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
  const path = e.composedPath()
  const root = shellRef.value
  if (root instanceof HTMLElement && !domPathTouches(root, path)) {
    openDropdown.value = null
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inflight: AbortController | null = null
let syncingFromUrl = false

function scheduleReload(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    page.value = 1
    void loadList()
  }, 350)
}

async function loadList(): Promise<void> {
  if (inflight) inflight.abort()
  const ctrl = new AbortController()
  inflight = ctrl
  listLoading.value = true
  listError.value = null
  contactError.value = null
  contactErrorIsCredits.value = false
  const res = await fetchList(filters.value, page.value, limit, { signal: ctrl.signal })
  if (ctrl.signal.aborted) {
    return
  }
  inflight = null
  listLoading.value = false
  if (res.aborted) return
  if (!res.ok || !res.data) {
    listError.value = res.error ?? 'Chyba načítania'
    items.value = []
    total.value = 0
    return
  }
  items.value = res.data.items
  total.value = res.data.total
  totalIsPartial.value = Boolean(res.data.total_is_partial)
}

watch(
  filters,
  async (next) => {
    if (syncingFromUrl) return
    scheduleReload()
    const query = serializeCandidateFiltersToQuery(next)
    await router.replace({ query: query as Record<string, string | string[]> })
  },
  { deep: true },
)

watch(
  () => route.query,
  (q) => {
    const parsed = parseCandidateFiltersFromQuery(q)
    if (JSON.stringify(parsed) === JSON.stringify(filters.value)) return
    syncingFromUrl = true
    filters.value = parsed
    page.value = 1
    void loadList()
    queueMicrotask(() => {
      syncingFromUrl = false
    })
  },
)

function onSearchSubmit(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  page.value = 1
  mobileFiltersOpen.value = false
  void loadList()
}

function goPrev(): void {
  if (page.value <= 1) return
  page.value -= 1
  void loadList()
}

function goNext(): void {
  if (offset.value + limit >= total.value) return
  page.value += 1
  void loadList()
}

function retry(): void {
  void loadList()
}

function openDetail(cvId: string): void {
  initialChatApplications.value = null
  contactError.value = null
  contactErrorIsCredits.value = false
  detailCvId.value = cvId
  detailOpen.value = true
}

function applyContactFieldsToRow(
  cvId: string,
  email: string | null,
  phone: string | null,
): void {
  const row = items.value.find((i) => i.cv_id === cvId)
  if (!row) return
  row.contacts_visible = true
  row.has_contact_to_unlock = false
  row.contact_email = email
  row.contact_phone = phone
}

function readContactFromAggregate(cv: {
  email?: unknown
  phone?: unknown
}): { email: string | null; phone: string | null } {
  const emailRaw = cv.email
  const phoneRaw = cv.phone
  const email =
    typeof emailRaw === 'string' && emailRaw.trim() ? emailRaw.trim() : null
  const phone =
    typeof phoneRaw === 'string' && phoneRaw.trim() ? phoneRaw.trim() : null
  return { email, phone }
}

function cardActionErrorMessage(
  res: { error?: string; insufficientCredits?: boolean; quotaExceeded?: boolean },
  fallback: string,
): string {
  if (res.insufficientCredits) return insufficientCreditsUserMessage()
  if (res.quotaExceeded) return CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE
  return res.error ?? fallback
}

async function onCardUnlock(cvId: string): Promise<void> {
  contactError.value = null
  contactErrorIsCredits.value = false
  unlockBusyCvId.value = cvId
  const unlockRes = await postUnlockContact(cvId)
  unlockBusyCvId.value = null
  if (!unlockRes.ok) {
    contactErrorIsCredits.value = Boolean(unlockRes.insufficientCredits)
    contactError.value = cardActionErrorMessage(
      unlockRes,
      S.insufficientCreditsMessage,
    )
    return
  }
  await syncUnlockedContactToUi(cvId)
}

function onDetailUnlocked(payload: {
  cvId: string
  email: string | null
  phone: string | null
}): void {
  applyContactFieldsToRow(payload.cvId, payload.email, payload.phone)
}

async function syncUnlockedContactToUi(cvId: string): Promise<void> {
  const det = await fetchDetail(cvId)
  if (det.ok && det.data) {
    const { email, phone } = readContactFromAggregate(det.data.cv)
    applyContactFieldsToRow(cvId, email, phone)
  } else {
    applyContactFieldsToRow(cvId, null, null)
  }
}

async function onCardContact(cvId: string): Promise<void> {
  contactError.value = null
  contactErrorIsCredits.value = false
  contactBusyCvId.value = cvId
  const res = await postOpenChat(cvId)
  contactBusyCvId.value = null
  if (!res.ok) {
    contactErrorIsCredits.value = Boolean(res.insufficientCredits)
    contactError.value = cardActionErrorMessage(res, 'Chyba').trim().slice(0, 280)
    return
  }
  if (!res.data) return
  if ('room_id' in res.data) {
    await router.push(ROUTES.chatRoom(res.data.room_id))
    return
  }
  const apps = res.data.applications ?? []
  initialChatApplications.value = apps.length ? apps : null
  detailCvId.value = cvId
  detailOpen.value = true
}

watch(detailOpen, (isOpen) => {
  if (!isOpen) {
    detailCvId.value = null
    initialChatApplications.value = null
  }
})

onMounted(() => {
  document.addEventListener('click', onDocClick)
  void loadList()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  if (debounceTimer) clearTimeout(debounceTimer)
  if (inflight) inflight.abort()
})

const skeletonCount = 8
</script>

<template>
  <div
    ref="shellRef"
    class="mx-auto w-full max-w-[1400px] box-border px-5 pb-10 font-dmSans text-black/80"
  >
    <section :class="catalogFilterHeroClass">
      <h1 class="m-0 mb-5 font-dmSans text-[28px] font-extrabold leading-tight text-white marketing:mb-6 marketing:text-[34px]">
        {{ S.navCvDatabaseTitle }}
      </h1>

      <ListMobileFiltersDropdown
        v-model:open="mobileFiltersOpen"
        :more-label="S.listSearchShowMore"
        :less-label="S.listSearchShowLess"
        :panel-region-label="S.listFiltersPanelRegionAria"
      >
        <template #search>
          <form
            class="list-search-shell"
            @submit.prevent="onSearchSubmit"
          >
            <input
              v-model="filters.q"
              type="search"
              class="list-search-input"
              :placeholder="S.cvDbSearchPlaceholder"
              :aria-label="S.cvDbSearchLabel"
            >
            <button
              type="submit"
              class="flex size-10 shrink-0 items-center justify-center rounded-full border-none bg-marketing-green p-0 text-white"
              :aria-label="S.cvDbSearchLabel"
            >
              <AppIcon name="search" :size="18" class="text-white" />
            </button>
          </form>
        </template>
        <FindFiltersDropdownGrid />
      </ListMobileFiltersDropdown>

      <div class="hidden marketing:block">
        <form
          class="list-search-shell min-w-0 w-full"
          @submit.prevent="onSearchSubmit"
        >
          <input
            v-model="filters.q"
            type="search"
            class="list-search-input"
            :placeholder="S.cvDbSearchPlaceholder"
            :aria-label="S.cvDbSearchLabel"
          >
          <button
            type="submit"
            class="flex size-10 shrink-0 items-center justify-center rounded-full border-none bg-marketing-green p-0 text-white"
            :aria-label="S.cvDbSearchLabel"
          >
            <AppIcon name="search" :size="18" class="text-white" />
          </button>
        </form>
        <div class="mt-5">
          <FindFiltersDropdownGrid />
        </div>
      </div>

      <button
        v-if="filtersActive"
        type="button"
        class="mt-4 border-none bg-transparent font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4"
        @click="clearAll"
      >
        {{ S.clearFilters }}
      </button>
    </section>

    <section class="job-posts w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p v-if="!listLoading && !listError && items.length" class="m-0 font-dmSans text-sm text-black/60">
          {{ S.cvDbResultsCount }}: <span class="font-semibold text-black/80">{{ total }}</span>
          <span v-if="totalIsPartial" class="text-black/45"> ({{ S.cvDbResultsCountPartial }})</span>
        </p>
      </div>

      <p
        v-if="contactError"
        class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-dmSans text-sm text-red-800"
        role="alert"
      >
        {{ contactError }}
        <NuxtLink
          v-if="contactErrorIsCredits"
          :to="BUY_CREDITS_PATH"
          class="mt-2 inline-block font-semibold underline"
        >
          {{ S.insufficientCreditsAction }}
        </NuxtLink>
      </p>

      <div class="flex w-full flex-col gap-4">
        <template v-if="listLoading">
          <div
            v-for="n in skeletonCount"
            :key="`cv-sk-${n}`"
            class="animate-pulse flex gap-4 overflow-hidden rounded-[15px] bg-marketing-surface p-4 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)] sm:p-5"
          >
            <div class="size-14 shrink-0 rounded-xl bg-black/10 sm:size-[72px]" />
            <div class="min-w-0 flex-1 space-y-3 py-1">
              <div class="h-5 w-48 rounded bg-black/10 sm:w-56" />
              <div class="h-4 w-full max-w-md rounded bg-black/10" />
              <div class="h-4 w-full max-w-sm rounded bg-black/10" />
              <div class="h-4 w-2/3 rounded bg-black/10" />
            </div>
            <div class="hidden w-[8.5rem] shrink-0 flex-col justify-center gap-2 sm:flex">
              <div class="h-11 w-full rounded-full bg-black/10" />
              <div class="h-11 w-full rounded-full bg-black/10" />
              <div class="h-11 w-full rounded-full bg-black/10" />
            </div>
          </div>
        </template>
        <div
          v-else-if="listError"
          class="flex w-full flex-col items-center gap-3 rounded-[15px] bg-marketing-surface px-6 py-12 text-center shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]"
        >
          <p class="m-0 font-dmSans text-base font-semibold text-red-600">{{ listError }}</p>
          <button
            type="button"
            class="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border-none bg-marketing-green px-6 font-dmSans text-base font-bold text-white transition-opacity hover:opacity-90"
            @click="retry"
          >
            {{ S.cvDbErrorRetry }}
          </button>
        </div>
        <div
          v-else-if="!items.length"
          class="flex w-full flex-col items-center gap-3 rounded-[15px] bg-marketing-surface px-6 py-16 text-center shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]"
        >
          <h2 class="m-0 font-dmSans text-xl font-extrabold text-black">{{ S.cvDbNoResultsTitle }}</h2>
          <p class="m-0 max-w-md font-dmSans text-base text-black/55">{{ S.cvDbNoResultsHelp }}</p>
          <button
            type="button"
            class="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-marketing-green bg-transparent px-6 font-dmSans text-base font-bold text-marketing-green transition-colors hover:bg-marketing-mint"
            @click="clearAll"
          >
            {{ S.cvDbClearAll }}
          </button>
        </div>
        <template v-else>
          <CvCandidateCard
            v-for="row in items"
            :key="row.cv_id"
            :item="row"
            :active-skill-filters="filters.skills"
            :contact-busy="contactBusyCvId === row.cv_id"
            :unlock-busy="unlockBusyCvId === row.cv_id"
            @view="openDetail(row.cv_id)"
            @unlock="onCardUnlock(row.cv_id)"
            @contact="onCardContact(row.cv_id)"
          />
        </template>
      </div>

      <div
        v-if="items.length && total > limit"
        class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[15px] bg-marketing-surface px-4 py-4 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]"
      >
        <p class="m-0 font-dmSans text-sm text-black/55">
          Zobrazené {{ offset + 1 }}–{{ Math.min(offset + items.length, total) }} z {{ total }}
          <span v-if="totalIsPartial" class="text-black/40"> (v rámci limitu prehľadu)</span>
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white px-5 font-dmSans text-sm font-semibold text-black/75 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page <= 1 || listLoading"
            @click="goPrev"
          >
            Späť
          </button>
          <button
            type="button"
            class="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white px-5 font-dmSans text-sm font-semibold text-black/75 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="offset + limit >= total || listLoading"
            @click="goNext"
          >
            Ďalej
          </button>
        </div>
      </div>
    </section>

    <CvCandidateDetailModal
      v-model:open="detailOpen"
      :cv-id="detailCvId"
      :initial-chat-applications="initialChatApplications"
      @unlocked="onDetailUnlocked"
    />
  </div>
</template>
