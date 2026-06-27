<template>
  <div ref="firmyShellRef" class="mx-auto w-full max-w-[1400px] box-border px-5 pb-10 font-dmSans text-black/80">
    <section :class="catalogFilterHeroClass">
      <h1 class="m-0 mb-5 font-dmSans text-[28px] font-extrabold leading-tight text-white marketing:mb-6 marketing:text-[34px]">
        {{ S.firmyTitle }}
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
            @submit.prevent="() => fetchAds()"
          >
            <input
              v-model="filters.search"
              class="list-search-input"
              :placeholder="S.firmySearchPlaceholder"
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
          <FirmFiltersDropdownGrid />
        </div>
      </ListMobileFiltersDropdown>
      <div class="hidden marketing:block">
        <form
          class="list-search-shell min-w-0 w-full"
          @submit.prevent="() => fetchAds()"
        >
          <input
            v-model="filters.search"
            class="list-search-input"
            :placeholder="S.firmySearchPlaceholder"
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
        <div class="mt-5">
          <FirmFiltersDropdownGrid />
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
    <section class="w-full">
      <div class="grid w-full max-w-[1400px] grid-cols-1 gap-[25px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <template v-if="loading">
          <div
            v-for="n in 8"
            :key="`sk-${n}`"
            class="animate-pulse overflow-hidden rounded-[15px] bg-marketing-surface shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]"
          >
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
            class="mt-3 block w-full is-clickable border-none bg-transparent font-semibold text-marketing-green underline"
            @click="() => fetchAds(true)"
          >
            {{ S.listFetchRetry }}
          </button>
        </p>
        <p
          v-else-if="companyAds.length === 0"
          class="col-span-full py-10 text-center font-dmSans text-lg text-marketing-muted"
        >
          {{ S.firmyNoAds }}
        </p>
        <template v-else>
          <CompanyAdListCard v-for="ad in companyAds" :key="ad.id" :ad="ad" />
        </template>
      </div>
      <div v-if="hasMore && !loading && !fetchError" class="mt-8 flex justify-center">
        <button
          type="button"
          class="is-clickable rounded-full border border-black/15 bg-white px-6 py-3 font-dmSans text-sm font-semibold text-black/80 hover:bg-black/[0.03] disabled:opacity-50"
          :disabled="loadingMore"
          @click="() => fetchAds(false)"
        >
          {{ loadingMore ? S.loading : 'Načítať ďalšie' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Company ads list — same filter/URL/debounce patterns as find.vue (firm-list-filters-context).
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { catalogFilterHeroClass } from '~/utils/marketing-ui'
import { CATEGORIES, getCategoryLabel } from '~/utils/job'
import { parseCategorySelection, toggleCategorySlug } from '~/utils/list-filter-category'
import ListMobileFiltersDropdown from '~/components/list/ListMobileFiltersDropdown.vue'
import FirmFiltersDropdownGrid from '~/components/firmy/FirmFiltersDropdownGrid.vue'
import {
  buildFirmListFiltersUi,
  FIRM_LIST_FILTERS_KEY,
} from '~/components/firmy/firm-list-filters-context'
import CompanyAdListCard from '~/components/firmy/CompanyAdListCard.vue'
import type { CompanyAdListItem } from '~/utils/company-ad'
import { fetchPublicCompanyAdsCatalog } from '~/composables/fetch-public-company-ads-catalog'
import { buildProfessionalsCatalogSeoDescription } from '~/utils/find-catalog-seo'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildAdsAlternateFeeds } from '~/utils/seo-feed-links'
import { buildProfessionalAdCatalogItemListJsonLd } from '~/utils/seo-json-ld'

definePageMeta({ layout: 'app' })

const PAGE_SIZE = 24

const route = useRoute()
const router = useRouter()
const firmyShellRef = ref<HTMLElement | null>(null)
const mobileFiltersOpen = ref(false)
const { api } = useApi()

const sortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'created_at' as const, label: 'Najnovšie' },
]

function parseRouteString(key: string): string {
  const raw = route.query[key]
  return typeof raw === 'string' ? raw : ''
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

function parseSortFromRoute(): 'relevance' | 'created_at' {
  const s = parseRouteString('sort')
  if (s === 'created_at' || s === 'relevance') {
    return s
  }
  return 'relevance'
}

const filters = reactive({
  search: typeof route.query.q === 'string' ? route.query.q : '',
  category: parseCategoryFromRoute(),
  location: parseRouteString('location'),
  sort: parseSortFromRoute(),
})

function readFiltersFromQuery(): {
  search: string
  category: string
  location: string
  sort: 'relevance' | 'created_at'
} {
  return {
    search: typeof route.query.q === 'string' ? route.query.q : '',
    category: parseCategoryFromRoute(),
    location: parseRouteString('location'),
    sort: parseSortFromRoute(),
  }
}

function filtersEqual(
  a: { search: string; category: string; location: string; sort: 'relevance' | 'created_at' },
  b: { search: string; category: string; location: string; sort: 'relevance' | 'created_at' },
): boolean {
  return (
    a.search === b.search &&
    a.category === b.category &&
    a.location === b.location &&
    a.sort === b.sort
  )
}

const companyAds = ref<CompanyAdListItem[]>([])
const loading = ref(true)

const runtimeConfig = useRuntimeConfig()
const siteUrl = computed(() =>
  normalizeSiteUrl(String(runtimeConfig.public.siteUrl || '')),
)

const { data: initialAds } = await useAsyncData(
  () =>
    `professionals-catalog-${String(route.query.q ?? '')}-${String(route.query.category ?? '')}-${String(route.query.location ?? '')}`,
  () =>
    fetchPublicCompanyAdsCatalog({
      limit: PAGE_SIZE,
      q: filters.search,
      category: filters.category,
      location: filters.location,
    }),
  { watch: [() => route.query] },
)

if (initialAds.value?.length) {
  companyAds.value = initialAds.value
  loading.value = false
}

usePageSeo(() => {
  const site = siteUrl.value
  const itemList = site
    ? buildProfessionalAdCatalogItemListJsonLd(companyAds.value, site)
    : null
  return {
    title: S.seoCatalogProfessionalsTitle,
    description: buildProfessionalsCatalogSeoDescription(),
    canonicalPath: ROUTES.professionalsCatalog,
    alternateFeeds: site ? buildAdsAlternateFeeds(site) : [],
    jsonLd: itemList,
  }
})
const loadingMore = ref(false)
const listOffset = ref(0)
const hasMore = ref(false)
const fetchError = ref<string | null>(null)
const openDropdown = ref<string | null>(null)

const categoryOptions = computed(() => {
  const base = CATEGORIES.map((c) => ({ value: c, label: getCategoryLabel(c) }))
  return [{ value: 'all', label: S.allCategories }, ...base]
})

const categoryMultiOptions = computed(() =>
  CATEGORIES.map((c) => ({ value: c, label: getCategoryLabel(c) })),
)

const categoryDropdownLabel = computed(() => {
  const cats = parseCategorySelection(filters.category)
  if (cats.length === 0) {
    return S.filterCategory
  }
  if (cats.length === 1) {
    return getCategoryLabel(cats[0]!)
  }
  if (cats.length === 2) {
    return `${getCategoryLabel(cats[0]!)}, ${getCategoryLabel(cats[1]!)}`
  }
  return `${cats.length} kategórií`
})

const categoryTriggerMuted = computed(() => parseCategorySelection(filters.category).length === 0)

const sortDropdownLabel = computed(() => {
  const hit = sortOptions.find((o) => o.value === filters.sort)
  return hit?.label ?? 'Zoradiť'
})

const sortTriggerMuted = computed(() => filters.sort === 'relevance')

const hasActiveFilters = computed(() => {
  const f = filters
  return (
    parseCategorySelection(f.category).length > 0 ||
    !!f.search.trim() ||
    !!f.location.trim() ||
    f.sort !== 'relevance'
  )
})

provide(
  FIRM_LIST_FILTERS_KEY,
  buildFirmListFiltersUi({
    category: toRef(filters, 'category'),
    locationFilter: toRef(filters, 'location'),
    sort: toRef(filters, 'sort'),
    openDropdown,
    toggleDropdown,
    toggleCategory,
    clearCategories,
    isCategorySelected,
    selectLocation,
    selectSort,
    categoryOptions,
    categoryMultiOptions,
    categoryDropdownLabel,
    categoryTriggerMuted,
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
  const root = firmyShellRef.value
  if (root instanceof HTMLElement && !domPathTouches(root, path)) {
    openDropdown.value = null
  }
}

function toggleCategory(value: string): void {
  filters.category = toggleCategorySlug(filters.category, value)
  openDropdown.value = null
  void fetchAds()
}

function clearCategories(): void {
  filters.category = 'all'
  void fetchAds()
}

function isCategorySelected(value: string): boolean {
  return parseCategorySelection(filters.category).includes(value)
}

function selectLocation(value: string): void {
  filters.location = value
  void fetchAds()
}

function selectSort(value: 'relevance' | 'created_at'): void {
  filters.sort = value
  openDropdown.value = null
  void fetchAds()
}

function replaceRouteQuery(): void {
  const q: Record<string, string> = {}
  if (filters.search.trim()) {
    q.q = filters.search.trim()
  }
  if (filters.category !== 'all') {
    q.category = filters.category
  }
  if (filters.location.trim()) {
    q.location = filters.location.trim()
  }
  if (filters.sort !== 'relevance') {
    q.sort = filters.sort
  }
  void router.replace({ path: ROUTES.professionalsCatalog, query: q })
}

async function fetchAds(reset = true, syncRoute = true): Promise<void> {
  if (!reset && (loadingMore.value || !hasMore.value)) return
  if (reset) {
    loading.value = true
    listOffset.value = 0
    companyAds.value = []
    hasMore.value = false
    fetchError.value = null
  } else {
    loadingMore.value = true
  }
  try {
    const query: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String(listOffset.value),
    }
    if (filters.category !== 'all') {
      query.category = filters.category
    }
    if (filters.search.trim()) {
      query.q = filters.search.trim()
    }
    if (filters.location.trim()) {
      query.location = filters.location.trim()
    }
    const res = await api<CompanyAdListItem[]>('/api/company-ads', { query })
    let items: CompanyAdListItem[] = res.ok && Array.isArray(res.data) ? res.data : []
    if (!res.ok && reset) {
      fetchError.value = S.listFetchError
      companyAds.value = []
      return
    }
    if (filters.sort === 'created_at') {
      items = [...items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    }
    if (reset) {
      companyAds.value = items
    } else {
      companyAds.value = [...companyAds.value, ...items]
    }
    hasMore.value = items.length >= PAGE_SIZE
    if (hasMore.value) {
      listOffset.value += PAGE_SIZE
    }
    if (syncRoute && reset) {
      replaceRouteQuery()
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch(): void {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void fetchAds()
  }, 300)
}

function onSearchInput(): void {
  debouncedFetch()
}

function clearFilters(): void {
  Object.assign(filters, {
    search: '',
    category: 'all',
    location: '',
    sort: 'relevance',
  })
  openDropdown.value = null
  mobileFiltersOpen.value = false
  void router.replace({ path: ROUTES.professionalsCatalog, query: {} })
  void fetchAds(true)
}

watch(initialAds, (data) => {
  if (!data) return
  companyAds.value = data
  loading.value = false
})

watch(
  () => route.query,
  () => {
    const next = readFiltersFromQuery()
    if (filtersEqual(filters, next)) {
      return
    }
    Object.assign(filters, next)
    void fetchAds(true, false)
  },
  { deep: true },
)

onMounted(() => {
  document.addEventListener('click', onDocClick, true)
  if (!initialAds.value) {
    void fetchAds()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, true)
  clearTimeout(debounceTimer)
})
</script>
