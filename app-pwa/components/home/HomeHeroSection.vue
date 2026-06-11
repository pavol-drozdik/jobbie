<template>
  <section
    class="relative w-full overflow-hidden marketing:mt-[30px]"
    aria-label="Úvod"
  >
    <div
      class="mx-auto w-full max-w-[1440px] px-5 pt-[10px] pb-8 marketing:px-12 marketing:py-14 marketingXl:px-16"
    >
      <div
        class="grid grid-cols-1 items-center gap-10 marketing:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] marketing:gap-8 marketingXl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] marketingXl:gap-12"
      >
        <div class="min-w-0">
          <h1
            class="mb-5 mt-0 max-w-[720px] font-dmSans text-[46px] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#1a1a1a] marketing:mb-6 marketing:text-[68px] marketing:leading-[1.05] marketingXl:text-[72px] marketingXl:tracking-[-0.04em]"
          >
            Nájdi prácu,<br>
            ktorá ti
            <span class="relative inline-block whitespace-nowrap text-marketing-green">
              sadne.
              <svg
                class="pointer-events-none absolute -bottom-1 left-0 h-3 w-full min-w-[5.5rem] text-marketing-green marketing:-bottom-1.5 marketing:h-4"
                viewBox="0 0 200 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <path
                  d="M4 12C48 4 92 14 196 8"
                  stroke="currentColor"
                  stroke-width="4"
                  stroke-linecap="round"
                />
              </svg>
            </span>
          </h1>
          <p
            class="m-0 max-w-[640px] font-dmSans text-[17px] font-medium leading-[1.5] text-[#52635a] marketing:text-[19px] marketing:leading-[1.45]"
          >
            Spájame uchádzačov s overenými firmami po celom Slovensku — rýchlo, jednoducho a úplne zadarmo.
          </p>
          <form
            class="mt-7 flex w-full max-w-[640px] flex-row items-stretch overflow-hidden rounded-[999px] bg-white p-1 shadow-[0_12px_40px_rgba(14,28,20,0.1)] marketing:mt-8 marketing:p-1.5"
            @submit.prevent="onSearchSubmit"
          >
            <div class="flex min-h-[48px] min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 marketing:min-h-[52px] marketing:gap-2.5 marketing:px-5 marketing:py-2">
              <AppIcon name="search" :size="18" class="hidden shrink-0 text-[#9aa8a0] min-[400px]:block" />
              <input
                v-model="positionQuery"
                type="search"
                placeholder="Pozícia, napr. skladník"
                autocomplete="off"
                class="min-w-0 flex-1 border-none bg-transparent font-dmSans text-[14px] font-medium text-[#1a1a1a] outline-none placeholder:text-[#9aa8a0] marketing:text-base"
                aria-label="Pozícia"
              >
            </div>
            <div class="h-8 w-px shrink-0 self-center bg-[rgba(14,28,20,0.1)]" aria-hidden="true" />
            <div class="flex min-h-[48px] min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 marketing:min-h-[52px] marketing:gap-2.5 marketing:px-5 marketing:py-2">
              <AppIcon name="map-pin" :size="18" class="hidden shrink-0 text-[#9aa8a0] min-[400px]:block" />
              <input
                v-model="locationQuery"
                type="search"
                placeholder="Mesto alebo okolie"
                autocomplete="off"
                class="min-w-0 flex-1 border-none bg-transparent font-dmSans text-[14px] font-medium text-[#1a1a1a] outline-none placeholder:text-[#9aa8a0] marketing:text-base"
                aria-label="Mesto alebo okolie"
              >
            </div>
            <button
              type="submit"
              class="m-0 flex size-11 shrink-0 cursor-pointer items-center justify-center self-center rounded-full border-none bg-marketing-green text-white transition-opacity hover:opacity-90 marketing:size-[52px]"
              aria-label="Hľadať"
            >
              <AppIcon name="search" :size="20" class="text-white" />
            </button>
          </form>
          <div
            v-if="heroSearchBarChips.length > 0"
            class="mt-4 w-full max-w-[640px] min-w-0 marketing:mt-5"
            role="region"
            :aria-label="showRecentChips ? 'Nedávne filtre' : 'Kategórie'"
          >
            <div
              ref="recentChipsScrollRef"
              class="flex cursor-grab touch-pan-x flex-nowrap gap-2.5 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] select-none active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
              @pointerdown="onRecentChipsScrollPointerDown"
            >
              <NuxtLink
                v-for="(chip, index) in heroSearchBarChips"
                :key="chip.key"
                :to="{ path: ROUTES.find, query: chip.query }"
                role="listitem"
                class="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-dmSans text-sm font-semibold no-underline transition-colors marketing:px-[18px] marketing:py-2.5 marketing:text-[15px]"
                :class="heroChipLinkClass(index)"
              >
                <CategoryIcon
                  v-if="chip.categorySlug"
                  :category="chip.categorySlug"
                  :size="16"
                  :icon-class="heroChipIconClass(index)"
                />
                <AppIcon
                  v-else
                  :name="chip.iconName ?? 'briefcase'"
                  :size="16"
                  :class="heroChipIconClass(index)"
                />
                <span>{{ chip.label }}</span>
              </NuxtLink>
            </div>
          </div>
          <div class="mt-5 grid w-full max-w-[640px] grid-cols-1 gap-3 min-[520px]:grid-cols-2 marketing:mt-6">
            <NuxtLink
              :to="ROUTES.find"
              class="flex items-center gap-3 rounded-2xl bg-[#141414] p-4 no-underline shadow-[0_8px_24px_rgba(14,28,20,0.12)] transition-opacity hover:opacity-95 marketing:p-5"
            >
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-full bg-marketing-green/15 marketing:size-12"
              >
                <AppIcon name="user" :size="22" class="text-marketing-green" />
              </span>
              <span class="min-w-0 text-left">
                <span class="block font-dmSans text-[15px] font-bold leading-tight text-white marketing:text-base">Pre uchádzačov</span>
                <span class="mt-0.5 block font-dmSans text-[13px] font-medium text-white/70 marketing:text-sm">Hľadám prácu</span>
              </span>
            </NuxtLink>
            <NuxtLink
              :to="ROUTES.jobHub"
              class="flex items-center gap-3 rounded-2xl border border-[rgba(14,28,20,0.1)] bg-white p-4 no-underline shadow-[0_4px_16px_rgba(14,28,20,0.06)] transition-colors hover:border-marketing-green/25 marketing:p-5"
            >
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-full bg-marketing-green/10 marketing:size-12"
              >
                <AppIcon name="file-lines" :size="22" class="text-marketing-green" />
              </span>
              <span class="min-w-0 text-left">
                <span class="block font-dmSans text-[15px] font-bold leading-tight text-[#1a1a1a] marketing:text-base">Pre firmy</span>
                <span class="mt-0.5 block font-dmSans text-[13px] font-medium text-[#7e8b82] marketing:text-sm">Chcem inzerovať</span>
              </span>
            </NuxtLink>
          </div>
        </div>
        <div class="relative flex w-full min-w-0 items-center justify-center marketing:items-end">
          <img
            :src="heroPhoneSrc"
            alt=""
            width="800"
            height="800"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            class="h-auto w-full max-w-[min(100%,380px)] object-contain object-center marketing:max-w-none"
          >
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AppIconName } from '~/utils/app-icons'
import { ROUTES } from '~/utils/app-routes'
import {
  createEmptyFindSnapshot,
  formatRecentFindFilterLabel,
  hasActiveFindSnapshot,
  pushRecentFindFilter,
  readRecentFindFilters,
  snapshotToQuery,
  type RecentFindFilterSnapshot,
} from '~/utils/recent-find-filters'

const HERO_PHONE_SRC = '/img/jobbie-mobile-hero.webp'
const heroPhoneSrc = HERO_PHONE_SRC

useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: HERO_PHONE_SRC,
      type: 'image/webp',
      fetchpriority: 'high',
    },
  ],
})

const router = useRouter()
const route = useRoute()
const positionQuery = ref('')
const locationQuery = ref('')
const recentFindFilters = ref<RecentFindFilterSnapshot[]>([])
const recentChipsScrollRef = ref<HTMLElement | null>(null)
let recentChipsDragPointerId = -1
let recentChipsDragStartClientX = 0
let recentChipsDragStartScrollLeft = 0
let recentChipsDragMoved = false

type HomeHeroSearchChip = {
  key: string
  label: string
  query: Record<string, string>
  categorySlug?: string
  iconName?: AppIconName
}

function findSnapshotFromChip(partial: Partial<RecentFindFilterSnapshot>): RecentFindFilterSnapshot {
  return { ...createEmptyFindSnapshot(), ...partial }
}

const defaultCategoryChips: HomeHeroSearchChip[] = [
  {
    key: 'sklad',
    label: 'Sklad & logistika',
    query: snapshotToQuery(findSnapshotFromChip({ category: 'sklad' })),
    categorySlug: 'sklad',
  },
  {
    key: 'gastro',
    label: 'Gastro',
    query: snapshotToQuery(findSnapshotFromChip({ category: 'gastro' })),
    categorySlug: 'gastro',
  },
  {
    key: 'doucovanie',
    label: 'Doučovanie',
    query: snapshotToQuery(findSnapshotFromChip({ search: 'doučovanie' })),
    iconName: 'briefcase',
  },
  {
    key: 'predaj',
    label: 'Predaj',
    query: snapshotToQuery(findSnapshotFromChip({ search: 'predaj' })),
    iconName: 'briefcase',
  },
]

function recentFindChipCategorySlug(s: RecentFindFilterSnapshot): string | null {
  if (s.search.trim().length > 0) {
    return null
  }
  if (s.category !== 'all') {
    const firstSlug = s.category.split(',')[0]?.trim()
    if (firstSlug) {
      return firstSlug
    }
  }
  return null
}

function recentFindChipIconName(s: RecentFindFilterSnapshot): AppIconName {
  if (s.search.trim().length > 0) {
    return 'search'
  }
  if (recentFindChipCategorySlug(s)) {
    return 'briefcase'
  }
  if (s.salary_type.trim()) {
    if (
      s.salary_type === 'hourly' ||
      s.salary_type === 'monthly' ||
      s.salary_type === 'one_time'
    ) {
      return 'currency'
    }
    return 'briefcase'
  }
  if (s.min_hourly_wage.trim().length > 0 || s.max_hourly_wage.trim().length > 0) {
    return 'currency'
  }
  if (s.location.trim().length > 0) {
    return 'map-pin'
  }
  if (s.date_range !== 'all') {
    return 'calendar'
  }
  if (s.urgent_only) {
    return 'bolt'
  }
  if (s.featured_only) {
    return 'star'
  }
  if (s.job_type !== 'all') {
    return 'briefcase'
  }
  if (s.skills.trim().length > 0) {
    return 'briefcase'
  }
  return 'briefcase'
}

const recentFilterChips = computed((): HomeHeroSearchChip[] =>
  recentFindFilters.value.map((snap, i) => {
    const categorySlug = recentFindChipCategorySlug(snap)
    return {
      key: `${i}:${JSON.stringify(snapshotToQuery(snap))}`,
      query: snapshotToQuery(snap),
      label: formatRecentFindFilterLabel(snap),
      categorySlug: categorySlug ?? undefined,
      iconName: categorySlug ? undefined : recentFindChipIconName(snap),
    }
  }),
)

const showRecentChips = computed((): boolean => recentFilterChips.value.length > 0)

const heroSearchBarChips = computed((): HomeHeroSearchChip[] => {
  if (recentFilterChips.value.length > 0) {
    return recentFilterChips.value
  }
  return defaultCategoryChips
})

function heroChipLinkClass(index: number): string {
  if (showRecentChips.value) {
    return 'border-[rgba(14,28,20,0.12)] bg-white text-[#52635a] hover:border-marketing-green/25'
  }
  if (index === 0) {
    return 'border-transparent bg-marketing-green text-white'
  }
  return 'border-[rgba(14,28,20,0.12)] bg-white text-[#52635a] hover:border-marketing-green/25'
}

function heroChipIconClass(index: number): string {
  const base = 'shrink-0'
  if (showRecentChips.value || index > 0) {
    return `${base} text-marketing-green`
  }
  return `${base} text-white`
}

function refreshRecentFindFilters(): void {
  recentFindFilters.value = readRecentFindFilters()
}

function buildSearchSnapshot(): RecentFindFilterSnapshot {
  const snap = createEmptyFindSnapshot()
  const q = positionQuery.value.trim()
  const loc = locationQuery.value.trim()
  if (q.length > 0) snap.search = q
  if (loc.length > 0) snap.location = loc
  return snap
}

function onSearchSubmit(): void {
  const snap = buildSearchSnapshot()
  if (hasActiveFindSnapshot(snap)) {
    pushRecentFindFilter(snap)
    refreshRecentFindFilters()
  }
  void router.push({ path: ROUTES.find, query: snapshotToQuery(snap) })
}

function unbindRecentChipsDragWindowListeners(): void {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onRecentChipsDragWindowPointerMove)
  window.removeEventListener('pointerup', onRecentChipsDragWindowPointerUp)
  window.removeEventListener('pointercancel', onRecentChipsDragWindowPointerUp)
}

function onRecentChipsDragWindowPointerMove(e: PointerEvent): void {
  if (e.pointerId !== recentChipsDragPointerId) return
  const el = recentChipsScrollRef.value
  if (!el) return
  const dx = e.clientX - recentChipsDragStartClientX
  if (Math.abs(dx) > 5) {
    recentChipsDragMoved = true
    el.scrollLeft = recentChipsDragStartScrollLeft - dx
    e.preventDefault()
  }
}

function onRecentChipsDragWindowPointerUp(e: PointerEvent): void {
  if (e.pointerId !== recentChipsDragPointerId) return
  unbindRecentChipsDragWindowListeners()
  recentChipsDragPointerId = -1
  if (recentChipsDragMoved && typeof document !== 'undefined') {
    const blockNavClick = (ev: Event): void => {
      ev.preventDefault()
      ev.stopPropagation()
      document.removeEventListener('click', blockNavClick, true)
    }
    document.addEventListener('click', blockNavClick, true)
  }
  recentChipsDragMoved = false
}

function onRecentChipsScrollPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'touch') return
  if (e.button !== 0) return
  const el = recentChipsScrollRef.value
  if (!el) return
  recentChipsDragPointerId = e.pointerId
  recentChipsDragStartClientX = e.clientX
  recentChipsDragStartScrollLeft = el.scrollLeft
  recentChipsDragMoved = false
  window.addEventListener('pointermove', onRecentChipsDragWindowPointerMove, { passive: false })
  window.addEventListener('pointerup', onRecentChipsDragWindowPointerUp)
  window.addEventListener('pointercancel', onRecentChipsDragWindowPointerUp)
}

watch(
  () => route.path,
  (path) => {
    if (path === ROUTES.home) {
      refreshRecentFindFilters()
    }
  },
)

onMounted(() => {
  refreshRecentFindFilters()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    unbindRecentChipsDragWindowListeners()
  }
})
</script>
