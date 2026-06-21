<template>
  <div ref="findShellRef" class="mx-auto w-full max-w-[1400px] box-border px-5 pb-10 font-dmSans text-black/80">
    <section class="mb-[50px] mt-[30px] w-full max-w-[1400px] rounded-[20px] bg-[linear-gradient(155deg,rgb(21,128,61)_0%,rgb(34,197,94)_100%)] p-6 marketing:p-[50px]">
      <h1 class="m-0 mb-5 font-dmSans text-[28px] font-extrabold leading-tight text-white marketing:mb-6 marketing:text-[34px]">
        {{ pageTitle }}
      </h1>
      <datalist id="job-suggest-list">
        <option v-for="s in suggestions" :key="s" :value="s" />
      </datalist>
      <ListMobileFiltersDropdown
        v-model:open="mobileFiltersOpen"
        :more-label="S.listSearchShowMore"
        :less-label="S.listSearchShowLess"
        :panel-region-label="S.listFiltersPanelRegionAria"
      >
        <template #search>
          <form class="list-search-shell" @submit.prevent="() => fetchJobs(true)">
            <input
              v-model="filters.search"
              list="job-suggest-list"
              class="list-search-input"
              placeholder="Aká brigáda ?"
              @input="onSearchInput"
            >
            <button
              type="submit"
              class="flex size-10 shrink-0 items-center justify-center rounded-full border-none bg-marketing-green p-0 text-white"
              :aria-label="S.navHladat"
            >
              <AppIcon name="search" :size="18" class="text-white" />
            </button>
          </form>
        </template>
        <div class="flex flex-col gap-4">
          <FindFiltersDropdownGrid />
          <FindFiltersQuickBar />
        </div>
      </ListMobileFiltersDropdown>
      <div class="hidden marketing:block">
        <div class="grid min-w-0 w-full grid-cols-3 gap-5">
          <div class="col-span-2 min-w-0">
            <form class="list-search-shell" @submit.prevent="() => fetchJobs(true)">
              <input
                v-model="filters.search"
                list="job-suggest-list"
                class="list-search-input"
                placeholder="Aká brigáda ?"
                @input="onSearchInput"
              >
              <button
                type="submit"
                class="flex size-10 shrink-0 items-center justify-center rounded-full border-none bg-marketing-green p-0 text-white"
                :aria-label="S.navHladat"
              >
                <AppIcon name="search" :size="18" class="text-white" />
              </button>
            </form>
          </div>
          <FindFiltersQuickBar class="min-w-0" />
        </div>
        <div class="mt-5">
          <FindFiltersDropdownGrid />
        </div>
      </div>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="mt-4 border-none bg-transparent font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4"
        @click="clearFilters"
      >
        {{ S.clearFilters }}
      </button>
    </section>
    <section class="job-posts w-full">
      <div class="grid w-full max-w-[1400px] grid-cols-1 gap-[25px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <template v-if="loading">
          <div v-for="n in 8" :key="`sk-${n}`" class="animate-pulse overflow-hidden rounded-[15px] bg-marketing-surface shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]">
            <div class="aspect-[4/3] bg-black/10" />
            <div class="space-y-3 p-5">
              <div class="h-10 w-4/5 rounded bg-black/10" />
              <div class="h-4 w-full rounded bg-black/10" />
              <div class="h-4 w-2/3 rounded bg-black/10" />
            </div>
          </div>
        </template>
        <p
          v-else-if="fetchError"
          class="col-span-full py-10 text-center font-dmSans text-lg text-red-700"
          role="alert"
        >
          {{ fetchError }}
          <button
            type="button"
            class="mt-3 block w-full cursor-pointer border-none bg-transparent font-semibold text-marketing-green underline"
            @click="() => fetchJobs(true)"
          >
            {{ S.listFetchRetry }}
          </button>
        </p>
        <p v-else-if="jobs.length === 0" class="col-span-full py-10 text-center font-dmSans text-lg text-marketing-muted">
          {{ S.searchNoResults }}
        </p>
        <template v-else>
          <NuxtLink
            v-for="job in jobs"
            :key="job.id"
          :to="ROUTES.jobDetail(job.id)"
          class="catalog-job-card block min-w-0 overflow-hidden rounded-[15px] bg-marketing-surface no-underline shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]"
        >
          <div class="relative aspect-[4/3]">
            <NuxtImg
              :src="thumbUrl(job)"
              :alt="job.title"
              class="h-full w-full rounded-t-[15px] object-cover"
              width="400"
              height="300"
              loading="lazy"
              decoding="async"
              @error="onThumbError(job)"
            />
            <div
              class="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(249,252,250,0.95)] px-2.5 py-1 font-dmSans text-[13px] font-semibold text-gray-900"
            >
              <CategoryIcon
                :category="job.category"
                :size="14"
                icon-class="shrink-0 text-black"
              />
              <span>{{ getCategoryLabel(job.category || 'ine') }}</span>
            </div>
            <CatalogListingBadgeStack
              :show-top="Boolean(job.show_top_badge)"
              :show-urgent="job.is_urgent"
              :show-new="!job.is_urgent"
              corner-class="right-[10px] top-[10px]"
              size="md"
            />
          </div>
          <div class="min-w-0 p-5">
            <h3 class="mb-5 mt-0 min-h-10 min-w-0 break-words font-dmSans text-xl font-extrabold leading-5 text-black line-clamp-2">
              {{ job.title }}
            </h3>
            <div class="m-0 font-dmSans text-lg font-medium text-marketing-muted">
              <div class="flex min-w-0 items-center gap-2.5">
                <AppIcon name="map-pin" :size="18" class="shrink-0 text-marketing-muted" />
                <span class="min-w-0 truncate">{{ getJobCardCityDisplay(job) }}</span>
              </div>
              <div class="mt-2 flex items-center gap-2.5">
                <AppIcon name="calendar" :size="18" class="shrink-0 text-marketing-muted" />
                <span>{{ formatJobDateRange(job) }}</span>
              </div>
              <div class="mt-2 flex items-center gap-2.5 text-marketing-green">
                <AppIcon name="currency" :size="18" class="shrink-0 text-marketing-green" />
                <span>{{ getJobCardPayDisplay(job) }}</span>
              </div>
            </div>
            <div class="my-2.5 h-px w-full bg-[rgba(177,178,181,0.3)]" />
            <div class="flex items-center justify-between text-marketing-green">
              <div class="flex items-center gap-2">
                <div
                  class="flex size-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] font-dmSans text-base font-bold text-white"
                >
                  {{ profileInitials(job.employer_name) }}
                </div>
                <span class="font-dmSans text-base font-bold leading-tight text-black">
                  {{ job.employer_name?.trim() || 'Zamestnávateľ' }}
                </span>
              </div>
              <AppIcon name="arrow-right" :size="20" class="shrink-0 text-marketing-green" />
            </div>
          </div>
        </NuxtLink>
        </template>
      </div>
      <div ref="sentinelRef" class="mx-auto h-6 w-full max-w-[1400px]" aria-hidden="true" />
      <p v-if="loadingMore" class="py-6 text-center font-dmSans text-sm text-black/45">
        Načítavam ďalšie ponuky…
      </p>
      <div v-else-if="hasMore && jobs.length > 0" class="flex justify-center py-4">
        <button
          type="button"
          class="rounded-full border border-black/10 bg-white px-6 py-3 font-dmSans text-sm font-semibold text-black/75 shadow-sm hover:border-marketing-green hover:text-marketing-green"
          @click="() => fetchJobs(false)"
        >
          Načítať ďalšie ponuky
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Job catalog: filters in URL + provide(find-list-filters-context); search via Typesense with Postgres fallback.
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import {
  CATEGORIES,
  getCategoryLabel,
  getJobTypeLabel,
  JOB_TYPES,
  FOREIGN_JOB_TYPE_FILTERS,
  getJobCardCityDisplay,
  getJobCardPayDisplay,
  getJobCardThumbnailSrc,
} from '~/utils/job'
import type { Job } from '~/utils/job'
import {
  jobPhotoThumbnailSrcForStage,
  type JobPhotoThumbnailFallbackStage,
} from '~/utils/job-photo-url'
import {
  hasActiveFindSnapshot,
  pushRecentFindFilter,
  type RecentFindFilterSnapshot,
} from '~/utils/recent-find-filters'
import { parseCategorySelection, toggleCategorySlug } from '~/utils/list-filter-category'
import ListMobileFiltersDropdown from '~/components/list/ListMobileFiltersDropdown.vue'
import FindFiltersQuickBar from '~/components/find/FindFiltersQuickBar.vue'
import FindFiltersDropdownGrid from '~/components/find/FindFiltersDropdownGrid.vue'
import { buildFindListFiltersUi, FIND_LIST_FILTERS_KEY } from '~/components/find/find-list-filters-context'
import { foreignWorkLocationFilterOptions } from '~/utils/foreign-work-countries'
import {
  parseSalaryTypeFilterFromRoute,
  SALARY_TYPE_FILTER_OPTIONS,
  salaryTypeFilterShowsMinAmount,
  type SalaryTypeFilterValue,
} from '~/utils/job-post-options'
import {
  buildFindCatalogCanonicalQuery,
  buildFindCatalogRouteQuery,
  buildFindCatalogSeoDescription,
  findCatalogHasNonCanonicalFacets,
  parseFindCatalogPageFromRoute,
  type FindCatalogFiltersSnapshot,
} from '~/utils/find-catalog-seo'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildJobsAlternateFeeds } from '~/utils/seo-feed-links'
import { buildJobCatalogItemListJsonLd } from '~/utils/seo-json-ld'
import { fetchPublicJobCatalog } from '~/composables/fetch-public-job-catalog'

const props = defineProps<{
  isForeign: boolean
  pageTitle: string
  seoTitle?: string
}>()

const route = useRoute()
const router = useRouter()
const catalogPath = computed(() => (props.isForeign ? ROUTES.foreignFind : ROUTES.find))
const catalogSeoDescription = computed(() => buildFindCatalogSeoDescription(props.isForeign))
const runtimeConfig = useRuntimeConfig()
const catalogPage = computed(() => parseFindCatalogPageFromRoute(route.query))
const findShellRef = ref<HTMLElement | null>(null)
const mobileFiltersOpen = ref(false)
const { api } = useApi()
const { session } = useAuth()

const IMPRESSION_BATCH_DEBOUNCE_MS = 400
let impressionBuffer: string[] = []
let impressionTimer: ReturnType<typeof setTimeout> | null = null

function queueJobImpressions(jobIds: string[]): void {
  if (!session.value?.access_token || jobIds.length === 0) return
  impressionBuffer.push(...jobIds)
  if (impressionTimer) clearTimeout(impressionTimer)
  impressionTimer = setTimeout(flushJobImpressions, IMPRESSION_BATCH_DEBOUNCE_MS)
}

function flushJobImpressions(): void {
  impressionTimer = null
  const uniqueIds = [...new Set(impressionBuffer)]
  impressionBuffer = []
  if (uniqueIds.length === 0 || !session.value?.access_token) return
  api('/api/jobs/impressions', {
    method: 'POST',
    body: { job_ids: uniqueIds },
  }).catch(() => {})
}

function salaryTypeFilterToStored(value: SalaryTypeFilterValue): string {
  return value === 'all' ? '' : value
}

const jobs = ref<Job[]>([])
const loading = ref(true)
const fetchError = ref<string | null>(null)
const suggestions = ref<string[]>([])
const openDropdown = ref<string | null>(null)
const tierSilverActive = ref(false)
const tierBronzeActive = ref(false)
const thumbFallbackStages = ref<Record<string, JobPhotoThumbnailFallbackStage>>({})

const PAGE_SIZE = 24
/** Wage field: wait for typing pause before Typesense search (ms). */
const NUMERIC_FILTER_SEARCH_DEBOUNCE_MS = 800
const searchCursor = ref<string | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
/** Dismisses out-of-order results when route watch and onMounted both call `fetchJobs`. */
let searchListFetchGeneration = 0

watchEffect((onCleanup) => {
  const el = sentinelRef.value
  if (!el || loading.value || !hasMore.value) {
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        void fetchJobs(false)
      }
    },
    { root: null, rootMargin: '480px', threshold: 0 },
  )
  io.observe(el)
  onCleanup(() => io.disconnect())
})

const dateOptions = [
  { value: 'all' as const, label: 'Kedykoľvek' },
  { value: 'today' as const, label: 'Dnes' },
  { value: 'week' as const, label: 'Posledných 7 dní' },
  { value: 'month' as const, label: 'Posledných 30 dní' },
]

const locationFilterKind = computed(() => (props.isForeign ? 'country' : 'municipality') as const)

const locationFilterOptions = computed(() =>
  props.isForeign ? foreignWorkLocationFilterOptions() : [],
)

const payTypeOptions = [...SALARY_TYPE_FILTER_OPTIONS]

const sortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'created_at' as const, label: 'Najnovšie' },
  { value: 'compensation_amount' as const, label: 'Odmena' },
]

function searchFromRouteQuery(): string {
  const raw = route.query.q
  return typeof raw === 'string' ? raw : ''
}

function parseRouteString(key: string): string {
  const raw = route.query[key]
  return typeof raw === 'string' ? raw : ''
}

function parseSalaryFieldsFromRoute(): { salary_type: string; salary_min: string } {
  const filter = parseSalaryTypeFilterFromRoute(
    parseRouteString('salary_type'),
    parseRouteString('compensation_type'),
  )
  const salary_type = salaryTypeFilterToStored(filter)
  let salary_min = parseRouteString('salary_min')
  const legacyHourly = parseRouteString('min_hourly_wage')
  if (!salary_min && legacyHourly && filter === 'hourly') {
    salary_min = legacyHourly
  }
  return { salary_type, salary_min }
}

function parseDateRangeFromRoute(): 'all' | 'today' | 'week' | 'month' {
  const dr = parseRouteString('date_range')
  if (dr === 'today' || dr === 'week' || dr === 'month') {
    return dr
  }
  return 'all'
}

function parseSortFromRoute(): 'relevance' | 'created_at' | 'compensation_amount' {
  const s = parseRouteString('sort')
  if (s === 'created_at' || s === 'compensation_amount' || s === 'relevance') {
    return s
  }
  return 'relevance'
}

function parseCategoryFromRoute(): string {
  const raw = route.query.category
  if (typeof raw !== 'string' || !raw.trim()) {
    return 'all'
  }
  const t = raw.trim()
  if (t === 'all') {
    return 'all'
  }
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) {
    return 'all'
  }
  const known = new Set(CATEGORIES as readonly string[])
  const ok = parts.filter((p) => known.has(p))
  return ok.length === 0 ? 'all' : ok.join(',')
}

const categoryOptions = computed(() => {
  const base = CATEGORIES.map((c) => ({ value: c, label: getCategoryLabel(c) }))
  return [{ value: 'all', label: S.allCategories }, ...base]
})

const categoryMultiOptions = computed(() =>
  CATEGORIES.map((c) => ({ value: c, label: getCategoryLabel(c) })),
)

const jobTypeOptions = computed(() => [
  { value: 'all', label: S.anyJobType },
  ...JOB_TYPES.map((jt) => ({ value: jt.value, label: jt.label })),
  ...(props.isForeign
    ? FOREIGN_JOB_TYPE_FILTERS.map((jt) => ({
        value: jt.value,
        label: jt.label,
      }))
    : []),
])

const initialSalaryFields = parseSalaryFieldsFromRoute()
const filters = ref({
  search: searchFromRouteQuery(),
  category: parseCategoryFromRoute(),
  urgent_only: route.query.urgent_only === 'true',
  date_range: parseDateRangeFromRoute(),
  location: parseRouteString('location'),
  min_hourly_wage: parseRouteString('min_hourly_wage'),
  max_hourly_wage: parseRouteString('max_hourly_wage'),
  job_type: parseRouteString('job_type') || 'all',
  sort: parseSortFromRoute(),
  skills: parseRouteString('skills'),
  featured_only: route.query.featured_only === 'true',
  work_mode: parseRouteString('work_mode'),
  salary_type: initialSalaryFields.salary_type,
  salary_min: initialSalaryFields.salary_min,
  salary_max: parseRouteString('salary_max'),
  radius: parseRouteString('radius'),
})

const {
  data: initialCatalog,
  pending: catalogPending,
} = await useAsyncData(
  () =>
    `find-catalog-${props.isForeign}-${searchFromRouteQuery()}-${parseCategoryFromRoute()}-${catalogPage.value}`,
  () =>
    fetchPublicJobCatalog({
      isForeign: props.isForeign,
      limit: PAGE_SIZE,
      q: searchFromRouteQuery(),
      category: parseCategoryFromRoute(),
      page: catalogPage.value,
    }),
  { watch: [() => route.query, () => props.isForeign] },
)

if (initialCatalog.value?.items.length) {
  jobs.value = initialCatalog.value.items
  searchCursor.value = initialCatalog.value.next_cursor
  hasMore.value = initialCatalog.value.has_more
  loading.value = false
}

watch(initialCatalog, (data) => {
  if (!data?.items.length) return
  jobs.value = data.items
  searchCursor.value = data.next_cursor
  hasMore.value = data.has_more
  loading.value = false
})

function catalogFiltersSnapshot(): FindCatalogFiltersSnapshot {
  const f = filters.value
  return {
    search: f.search,
    category: f.category,
    location: f.location,
    sort: f.sort,
    urgent_only: f.urgent_only,
    date_range: f.date_range,
    job_type: f.job_type,
    skills: f.skills,
    featured_only: f.featured_only,
    work_mode: f.work_mode,
    salary_type: f.salary_type,
    salary_min: f.salary_min,
    salary_max: f.salary_max,
    min_hourly_wage: f.min_hourly_wage,
    max_hourly_wage: f.max_hourly_wage,
    radius: f.radius,
  }
}

function buildCatalogAbsolutePageUrl(page: number): string | undefined {
  const origin = normalizeSiteUrl(String(runtimeConfig.public.siteUrl || ''))
  if (!origin) return undefined
  const q = buildFindCatalogRouteQuery(catalogFiltersSnapshot(), { page })
  const qs = new URLSearchParams(q).toString()
  return qs ? `${origin}${catalogPath.value}?${qs}` : `${origin}${catalogPath.value}`
}

usePageSeo(() => {
  const canonicalQ = buildFindCatalogCanonicalQuery(catalogFiltersSnapshot())
  const nextPageNum =
    hasMore.value && jobs.value.length > 0 ? catalogPage.value + 1 : undefined
  const site = normalizeSiteUrl(String(runtimeConfig.public.siteUrl || ''))
  const itemList = site ? buildJobCatalogItemListJsonLd(jobs.value, site) : null
  return {
    title: props.seoTitle ?? props.pageTitle,
    description: catalogSeoDescription.value,
    canonicalPath: catalogPath.value,
    canonicalQuery: Object.keys(canonicalQ).length > 0 ? canonicalQ : undefined,
    robots: findCatalogHasNonCanonicalFacets(catalogFiltersSnapshot())
      ? 'noindex, follow'
      : undefined,
    alternateFeeds: site ? buildJobsAlternateFeeds(site) : [],
    jsonLd: itemList,
    pagination: {
      prev: catalogPage.value > 1 ? buildCatalogAbsolutePageUrl(catalogPage.value - 1) : undefined,
      next: nextPageNum ? buildCatalogAbsolutePageUrl(nextPageNum) : undefined,
    },
  }
})

const hasActiveFilters = computed(() => {
  const f = filters.value
  return (
    parseCategorySelection(f.category).length > 0 ||
    f.urgent_only ||
    !!f.search.trim() ||
    f.date_range !== 'all' ||
    !!f.location.trim() ||
    !!f.min_hourly_wage.trim() ||
    !!f.max_hourly_wage.trim() ||
    f.job_type !== 'all' ||
    f.sort !== 'relevance' ||
    !!f.skills.trim() ||
    !!f.salary_type.trim() ||
    f.featured_only ||
    !!f.work_mode.trim() ||
    !!f.salary_min.trim() ||
    !!f.salary_max.trim() ||
    !!f.radius.trim()
  )
})

const dateDropdownLabel = computed(() => {
  const hit = dateOptions.find((o) => o.value === filters.value.date_range)
  return hit?.label ?? 'Čas zverejnenia'
})
const dateTriggerMuted = computed(() => filters.value.date_range === 'all')

const categoryDropdownLabel = computed(() => {
  const cats = parseCategorySelection(filters.value.category)
  if (cats.length === 0) {
    return 'Kategória'
  }
  if (cats.length === 1) {
    return getCategoryLabel(cats[0]!)
  }
  if (cats.length === 2) {
    return `${getCategoryLabel(cats[0]!)}, ${getCategoryLabel(cats[1]!)}`
  }
  return `${cats.length} kategórií`
})
const categoryTriggerMuted = computed(() => parseCategorySelection(filters.value.category).length === 0)

const payDropdownLabel = computed(() => {
  const st = filters.value.salary_type.trim()
  if (!st) {
    return S.findFilterSalaryType
  }
  const hit = payTypeOptions.find((o) => o.value === st)
  const base = hit?.label ?? S.findFilterSalaryType
  if (salaryTypeFilterShowsMinAmount(st) && filters.value.salary_min.trim()) {
    return `${base} · ${filters.value.salary_min.trim()} €`
  }
  return base
})
const payTriggerMuted = computed(() => !filters.value.salary_type.trim())

const showPayPlatInput = computed(() =>
  salaryTypeFilterShowsMinAmount(filters.value.salary_type),
)

const payMinPlaceholder = computed(() => {
  const st = filters.value.salary_type.trim()
  if (st === 'monthly') return S.findFilterSalaryMinMonthly
  if (st === 'one_time') return S.findFilterSalaryMinLumpSum
  return S.findFilterSalaryMinHourly
})

const jobTypeDropdownLabel = computed(() => {
  if (filters.value.job_type === 'all') {
    return S.filterJobType
  }
  const raw = filters.value.job_type
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((p) => getJobTypeLabel(p.trim()) || p.trim())
      .filter(Boolean)
      .join(', ')
  }
  return getJobTypeLabel(raw) || raw
})
const jobTypeTriggerMuted = computed(() => filters.value.job_type === 'all')

const sortDropdownLabel = computed(() => {
  const hit = sortOptions.find((o) => o.value === filters.value.sort)
  return hit?.label ?? 'Zoradiť'
})
const sortTriggerMuted = computed(() => filters.value.sort === 'relevance')

provide(
  FIND_LIST_FILTERS_KEY,
  buildFindListFiltersUi({
    filters,
    tierSilverActive,
    tierBronzeActive,
    openDropdown,
    toggleDropdown,
    toggleFeaturedTier,
    toggleUrgent,
    selectDateRange,
    toggleCategory,
    clearCategories,
    isCategorySelected,
    locationFilterKind,
    locationFilterOptions,
    selectLocation,
    selectSalaryTypeFilter,
    selectJobType,
    selectSort,
    debouncedFetchNumbers,
    flushDebouncedNumericFilters,
    dateOptions,
    dateDropdownLabel,
    dateTriggerMuted,
    categoryOptions,
    categoryMultiOptions,
    categoryDropdownLabel,
    categoryTriggerMuted,
    payTypeOptions,
    payDropdownLabel,
    payTriggerMuted,
    showPayPlatInput,
    payMinPlaceholder,
    jobTypeOptions,
    jobTypeDropdownLabel,
    jobTypeTriggerMuted,
    sortOptions,
    sortDropdownLabel,
    sortTriggerMuted,
  }),
)

function toggleDropdown(id: string): void {
  openDropdown.value = openDropdown.value === id ? null : id
}

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
  const root = findShellRef.value
  if (root instanceof HTMLElement && !domPathTouches(root, path)) {
    openDropdown.value = null
  }
}

function selectDateRange(value: (typeof dateOptions)[number]['value']): void {
  filters.value.date_range = value
  openDropdown.value = null
  void fetchJobs(true)
}

function toggleCategory(value: string): void {
  filters.value.category = toggleCategorySlug(filters.value.category, value)
  void fetchJobs(true)
}

function clearCategories(): void {
  filters.value.category = 'all'
  void fetchJobs(true)
}

function isCategorySelected(value: string): boolean {
  return parseCategorySelection(filters.value.category).includes(value)
}

function selectLocation(value: string): void {
  filters.value.location = value
  void fetchJobs(true)
}

function selectSalaryTypeFilter(value: SalaryTypeFilterValue): void {
  filters.value.salary_type = salaryTypeFilterToStored(value)
  if (value === 'negotiable' || value === 'all') {
    filters.value.salary_min = ''
    openDropdown.value = null
    void fetchJobs(true)
    return
  }
  void fetchJobs(true)
}

function selectJobType(value: string): void {
  filters.value.job_type = value
  openDropdown.value = null
  void fetchJobs(true)
}

function selectSort(value: string): void {
  if (value !== 'relevance' && value !== 'created_at' && value !== 'compensation_amount') {
    return
  }
  filters.value.sort = value
  openDropdown.value = null
  void fetchJobs(true)
}

function toggleFeaturedTier(): void {
  filters.value.featured_only = !filters.value.featured_only
  void fetchJobs(true)
}

function toggleUrgent(): void {
  filters.value.urgent_only = !filters.value.urgent_only
  void fetchJobs(true)
}

function formatSkDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function formatJobDateRange(job: Job): string {
  const a = job.application_deadline
  const c = job.completion_deadline
  if (a && c) {
    return `${formatSkDate(a)} - ${formatSkDate(c)}`
  }
  if (c) {
    return formatSkDate(c)
  }
  if (a) {
    return formatSkDate(a)
  }
  return formatSkDate(job.created_at)
}

function profileInitials(name: string | null | undefined): string {
  const t = name?.trim()
  if (!t) {
    return '?'
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}

function thumbUrl(job: Job): string {
  const stage = thumbFallbackStages.value[job.id] ?? 0
  return jobPhotoThumbnailSrcForStage(getJobCardThumbnailSrc(job), stage)
}

function onThumbError(job: Job): void {
  const current = thumbFallbackStages.value[job.id] ?? 0
  if (current >= 2) {
    return
  }
  thumbFallbackStages.value = {
    ...thumbFallbackStages.value,
    [job.id]: (current + 1) as JobPhotoThumbnailFallbackStage,
  }
}

function replaceRouteQuery(includeCursor = false): void {
  const q: Record<string, string> = {
    ...buildFindCatalogRouteQuery(catalogFiltersSnapshot(), {
      page: catalogPage.value > 1 ? catalogPage.value : undefined,
      includePaginationKeys: true,
    }),
  }
  const f = filters.value
  if (f.urgent_only) {
    q.urgent_only = 'true'
  }
  if (f.date_range !== 'all') {
    q.date_range = f.date_range
  }
  if (f.min_hourly_wage.trim()) {
    q.min_hourly_wage = f.min_hourly_wage.trim()
  }
  if (f.max_hourly_wage.trim()) {
    q.max_hourly_wage = f.max_hourly_wage.trim()
  }
  if (f.job_type !== 'all') {
    q.job_type = f.job_type
  }
  if (f.sort !== 'relevance') {
    q.sort = f.sort
  }
  if (f.skills.trim()) {
    q.skills = f.skills.trim()
  }
  if (f.featured_only) {
    q.featured_only = 'true'
  }
  if (f.work_mode.trim()) {
    q.work_mode = f.work_mode.trim()
  }
  if (f.salary_type.trim()) {
    q.salary_type = f.salary_type.trim()
  }
  if (f.salary_min.trim()) {
    q.salary_min = f.salary_min.trim()
  }
  if (f.salary_max.trim()) {
    q.salary_max = f.salary_max.trim()
  }
  if (f.radius.trim()) {
    q.radius = f.radius.trim()
  }
  if (includeCursor && searchCursor.value && !q.page) {
    q.cursor = searchCursor.value
  }
  void router.replace({ path: catalogPath.value, query: q })
}

async function fetchJobs(reset = true, syncRoute = true): Promise<void> {
  // searchListFetchGeneration drops stale responses when route watch and mount race.
  if (!reset) {
    if (!hasMore.value || loadingMore.value || loading.value) {
      return
    }
    if (!searchCursor.value) {
      return
    }
    loadingMore.value = true
  }
  const gen = ++searchListFetchGeneration
  try {
    if (reset) {
      loading.value = true
      fetchError.value = null
      searchCursor.value = null
      jobs.value = []
      hasMore.value = false
    }
    const query: Record<string, string> = {
      entity: 'jobs',
      limit: String(PAGE_SIZE),
      include_facets: 'false',
      sort: filters.value.sort,
      is_foreign: props.isForeign ? 'true' : 'false',
    }
    const pageFromRoute = parseFindCatalogPageFromRoute(route.query)
    const usePageParam = typeof route.query.page === 'string'
    if (reset && usePageParam) {
      query.page = String(pageFromRoute)
    } else if (!reset && !usePageParam && searchCursor.value) {
      query.cursor = searchCursor.value
    }
    if (filters.value.search.trim()) {
      query.q = filters.value.search.trim()
    }
    if (filters.value.category !== 'all') {
      query.category = filters.value.category
    }
    if (filters.value.urgent_only) {
      query.urgent_only = 'true'
    }
    if (filters.value.date_range !== 'all') {
      query.date_range = filters.value.date_range
    }
    if (filters.value.location.trim()) {
      query.location = filters.value.location.trim()
    }
    if (filters.value.min_hourly_wage.trim()) {
      query.min_hourly_wage = filters.value.min_hourly_wage.trim()
    }
    if (filters.value.max_hourly_wage.trim()) {
      query.max_hourly_wage = filters.value.max_hourly_wage.trim()
    }
    if (filters.value.job_type !== 'all') {
      query.job_type = filters.value.job_type
    }
    if (filters.value.skills.trim()) {
      query.skills = filters.value.skills.trim()
    }
    if (filters.value.salary_type.trim()) {
      query.salary_type = filters.value.salary_type.trim()
    }
    if (filters.value.featured_only) {
      query.featured_only = 'true'
    }
    if (filters.value.work_mode.trim()) {
      query.work_mode = filters.value.work_mode.trim()
    }
    if (filters.value.salary_min.trim()) {
      query.salary_min = filters.value.salary_min.trim()
    }
    if (filters.value.salary_max.trim()) {
      query.salary_max = filters.value.salary_max.trim()
    }
    if (filters.value.radius.trim()) {
      query.radius = filters.value.radius.trim()
    }
    type SearchJobsResponse = {
      entity: 'jobs'
      source: 'typesense' | 'fallback'
      items: Job[]
      found?: number
      next_cursor?: string
      has_more?: boolean
    }
    const res = await api<SearchJobsResponse>('/api/search', { query })
    if (gen !== searchListFetchGeneration) {
      return
    }
    if (res.ok && Array.isArray(res.data?.items)) {
      const batch = res.data.items
      if (reset) {
        jobs.value = batch
      } else {
        jobs.value = [...jobs.value, ...batch]
      }
      searchCursor.value = res.data.next_cursor ?? null
      hasMore.value = Boolean(res.data.has_more)
      if (batch.length > 0) {
        queueJobImpressions(batch.map((j) => j.id))
      }
    } else {
      if (reset) {
        jobs.value = []
        fetchError.value = S.listFetchError
      }
      hasMore.value = false
      searchCursor.value = null
    }
    if (syncRoute) {
      replaceRouteQuery(!reset)
    }
  } finally {
    if (gen === searchListFetchGeneration) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

let suggestTimer: ReturnType<typeof setTimeout>
function debouncedSuggest() {
  clearTimeout(suggestTimer)
  suggestTimer = setTimeout(fetchSuggestions, 220)
}

async function fetchSuggestions() {
  const q = filters.value.search.trim()
  if (q.length < 2) {
    suggestions.value = []
    return
  }
  const res = await api<{ suggestions: string[] }>('/api/search/suggest', {
    query: { q, limit: '10' },
  })
  if (res.ok && Array.isArray(res.data?.suggestions)) {
    suggestions.value = res.data.suggestions
  }
}

function onSearchInput() {
  debouncedFetch()
  debouncedSuggest()
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void fetchJobs(true)
  }, 300)
}

let debounceNumbersTimer: ReturnType<typeof setTimeout>
function debouncedFetchNumbers(): void {
  clearTimeout(debounceNumbersTimer)
  debounceNumbersTimer = setTimeout(() => {
    void fetchJobs(true)
  }, NUMERIC_FILTER_SEARCH_DEBOUNCE_MS)
}

function flushDebouncedNumericFilters(): void {
  clearTimeout(debounceNumbersTimer)
  void fetchJobs(true)
}

function clearFilters() {
  filters.value = {
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
    featured_only: false,
    work_mode: '',
    salary_type: '',
    salary_min: '',
    salary_max: '',
    radius: '',
  }
  tierSilverActive.value = false
  tierBronzeActive.value = false
  suggestions.value = []
  openDropdown.value = null
  mobileFiltersOpen.value = false
  void fetchJobs(true)
}

function filtersToSnapshot(): RecentFindFilterSnapshot {
  const f = filters.value
  return {
    search: f.search,
    category: f.category,
    urgent_only: f.urgent_only,
    date_range: f.date_range,
    location: f.location,
    min_hourly_wage: f.min_hourly_wage,
    max_hourly_wage: f.max_hourly_wage,
    job_type: f.job_type,
    sort: f.sort,
    skills: f.skills,
    featured_only: f.featured_only,
    work_mode: f.work_mode,
    salary_type: f.salary_type,
    salary_min: f.salary_min,
    salary_max: f.salary_max,
    radius: f.radius,
  }
}

let recordRecentTimer: ReturnType<typeof setTimeout>
function scheduleRecordRecentFilters(): void {
  clearTimeout(recordRecentTimer)
  recordRecentTimer = setTimeout(() => {
    const snap = filtersToSnapshot()
    if (!hasActiveFindSnapshot(snap)) {
      return
    }
    pushRecentFindFilter(snap)
  }, 900)
}

watch(
  filters,
  () => {
    if (!hasActiveFilters.value) {
      return
    }
    scheduleRecordRecentFilters()
  },
  { deep: true },
)

watch(
  () => jobs.value,
  (list) => {
    const ids = new Set(list.map((j) => j.id))
    const next = { ...thumbFallbackStages.value }
    for (const id of Object.keys(next)) {
      if (!ids.has(id)) {
        delete next[id]
      }
    }
    thumbFallbackStages.value = next
  },
)

watch(mobileFiltersOpen, (open) => {
  if (!open) {
    openDropdown.value = null
  }
})

watch(
  () => props.isForeign,
  () => {
    void fetchJobs(true)
  },
)

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  if (!jobs.value.length && !catalogPending.value) {
    await fetchJobs(true)
  }
  if (hasActiveFilters.value) {
    scheduleRecordRecentFilters()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  if (impressionTimer) clearTimeout(impressionTimer)
  flushJobImpressions()
})

watch(
  () => route.query,
  () => {
    filters.value.category = parseCategoryFromRoute()
    filters.value.urgent_only = route.query.urgent_only === 'true'
    filters.value.search = searchFromRouteQuery()
    filters.value.date_range = parseDateRangeFromRoute()
    filters.value.location = parseRouteString('location')
    filters.value.min_hourly_wage = parseRouteString('min_hourly_wage')
    filters.value.max_hourly_wage = parseRouteString('max_hourly_wage')
    filters.value.job_type = parseRouteString('job_type') || 'all'
    filters.value.sort = parseSortFromRoute()
    filters.value.skills = parseRouteString('skills')
    filters.value.featured_only = route.query.featured_only === 'true'
    filters.value.work_mode = parseRouteString('work_mode')
    const salaryFields = parseSalaryFieldsFromRoute()
    filters.value.salary_type = salaryFields.salary_type
    filters.value.salary_min = salaryFields.salary_min
    filters.value.salary_max = parseRouteString('salary_max')
    filters.value.radius = parseRouteString('radius')
    void fetchJobs(true)
  },
  { deep: true },
)
</script>

<style scoped>
.catalog-job-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 420px;
}
</style>

