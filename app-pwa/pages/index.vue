<template>
  <div>
    <div
      v-if="promoCreditsBanner"
      class="mx-auto mb-6 max-w-3xl rounded-2xl border border-marketing-green/30 bg-marketing-mint px-4 py-3 text-center text-sm font-semibold text-black"
      role="status"
    >
      {{ promoCreditsBanner }}
    </div>
    <HomeHeroSection />
    <section class="border-b-2 border-jobbie-ink bg-jobbie-ink" aria-label="Prečo Jobbie">
      <div class="mx-auto grid w-full max-w-[1400px] grid-cols-2 gap-6 px-5 py-7 marketing:grid-cols-4 marketing:px-12">
        <div v-for="(item, i) in homeTrustItems" :key="item.value" class="flex flex-col gap-1">
          <span class="font-display text-[26px] font-extrabold marketing:text-[34px]" :class="i % 2 ? 'text-jobbie-pink' : 'text-jobbie-lime'">{{ item.value }}</span>
          <span class="font-dmSans text-[15px] font-medium text-[#D7E3DB]">{{ item.label }}</span>
        </div>
      </div>
    </section>

    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[110px]">
      <div class="box-border w-full max-w-[1400px] px-5">
        <div class="flex flex-col gap-3 marketing:flex-row marketing:items-end marketing:justify-between">
          <div>
            <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
              Aká práca ti <span class="text-marketing-green">sadne?</span>
            </h2>
            <p class="m-0 mt-2 font-dmSans text-[17px] font-medium text-black/65 marketing:text-[22px]">Od sťahovania cez eventy až po záhradu.</p>
          </div>
          <NuxtLink :to="ROUTES.find" class="font-dmSans text-[17px] font-bold text-jobbie-ink underline decoration-2 underline-offset-4">Všetky ponuky</NuxtLink>
        </div>
        <div class="mt-8 grid w-full grid-cols-2 gap-4 min-[700px]:grid-cols-3 lg:grid-cols-5 lg:gap-5">
          <NuxtLink
            v-for="cat in CATEGORIES"
            :key="cat"
            :to="`${ROUTES.find}?category=${cat}`"
            class="flex min-h-[132px] flex-col justify-between gap-4 rounded-[18px] p-4 text-jobbie-ink no-underline shadow-brutal transition-transform duration-150 hover:-translate-y-0.5 marketing:p-5"
            :class="categoryTileClass(cat)"
          >
            <span class="flex size-12 items-center justify-center rounded-[13px] border-2 border-jobbie-ink bg-white">
              <CategoryIcon :category="cat" :size="24" icon-class="text-jobbie-ink" />
            </span>
            <span class="flex flex-col gap-0.5">
              <span class="font-dmSans text-lg font-bold leading-tight marketing:text-xl">{{ getCategoryLabel(cat) }}</span>
              <span class="font-dmSans text-sm font-medium text-jobbie-ink/75">{{ categoryJobCount(cat) }} aktuálnych ponúk</span>
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section ref="latestJobsSectionRef" class="mt-[72px] flex w-full flex-col items-center border-y-2 border-jobbie-ink bg-jobbie-pinkSoft py-16 marketing:mt-[110px] marketing:py-24">
      <div class="box-border w-full max-w-[1400px] px-5">
        <div class="mb-8 flex w-full flex-col items-start gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="mb-0 mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
              Aktuálne<span class="text-marketing-green"> ponuky</span>
            </h2>
            <p class="m-0 text-[17px] font-medium text-black/65 marketing:text-[22px]">Najnovšie ponuky pripravené priamo pre teba</p>
          </div>
          <NuxtLink :to="ROUTES.find" class="jb-btn jb-btn--ink text-[17px] marketing:text-xl">Zobraziť všetky ponuky</NuxtLink>
        </div>
        <div class="w-full">
          <div v-if="loadingGrid" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div v-for="n in 8" :key="n" class="overflow-hidden rounded-[15px] bg-marketing-surface shadow-[0_0_0_2px_#10231A,4px_4px_0_2px_#10231A]">
              <div class="aspect-[4/3] rounded-t-[15px] bg-gray-200" />
              <div class="space-y-3 p-5">
                <div class="h-10 w-3/4 rounded bg-gray-200" />
                <div class="h-3 w-full rounded bg-gray-100" />
              </div>
            </div>
          </div>
          <div v-else-if="gridJobs.length === 0" class="px-2 py-6 text-[17px] font-medium text-black/65 marketing:text-[22px]">{{ S.noJobsYet }}</div>
          <div v-else class="grid w-full max-w-[1400px] grid-cols-1 gap-5 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-4 min-[1100px]:gap-[25px]">
            <NuxtLink
              v-for="job in gridJobs"
              :key="job.id"
              :to="ROUTES.jobDetail(job.id)"
              class="jb-job-card block min-w-0 overflow-hidden rounded-[15px] bg-marketing-surface text-inherit no-underline shadow-[0_0_0_2px_#10231A,4px_4px_0_2px_#10231A] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_0_0_2px_#10231A,4px_4px_0_2px_#10231A]"
            >
              <div class="relative aspect-[4/3]">
                <div class="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(249,252,250,0.95)] px-2.5 py-1 font-dmSans text-[13px] font-semibold text-gray-900">
                  <CategoryIcon
                    :category="job.category"
                    :size="14"
                    icon-class="shrink-0 text-black"
                  />
                  <span>{{ getCategoryLabel(job.category ?? '') }}</span>
                </div>
                <CatalogListingBadgeStack
                  :show-top="Boolean(job.show_top_badge)"
                  :show-urgent="job.is_urgent"
                  :show-new="!job.is_urgent"
                  urgent-with-bolt
                />
                <NuxtImg
                  :src="thumbSrc(job)"
                  :alt="job.title"
                  width="400"
                  height="300"
                  loading="lazy"
                  decoding="async"
                  format="webp"
                  quality="82"
                  class="block size-full rounded-t-[15px] object-cover"
                  @error="onThumbError(job)"
                />
              </div>
              <div class="min-w-0 p-4 marketing:p-5">
                <h3 class="mb-5 mt-0 min-h-10 min-w-0 break-words font-dmSans text-xl font-extrabold leading-5 text-black line-clamp-2">
                  {{ job.title }}
                </h3>
                <div class="flex flex-col gap-2 font-dmSans text-[15px] font-medium text-marketing-muted marketing:text-lg">
                  <div class="flex min-w-0 items-center gap-2.5">
                    <AppIcon name="map-pin" :size="18" class="shrink-0 text-[#8e8e8e]" />
                    <span class="min-w-0 truncate">{{ getJobCardCityDisplay(job) }}</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <AppIcon name="calendar" :size="18" class="shrink-0 text-[#8e8e8e]" />
                    <span>{{ formatJobDateRange(job) }}</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-marketing-green">
                    <AppIcon name="currency" :size="18" class="shrink-0" />
                    <span>{{ getJobCardPayDisplay(job) }}</span>
                  </div>
                </div>
                <div class="my-2.5 h-px w-full bg-[rgba(177,178,181,0.3)]" />
                <div class="flex items-center justify-between text-marketing-green">
                  <div class="flex min-w-0 items-center gap-2">
                    <div class="flex size-10 min-w-10 items-center justify-center rounded-full border-2 border-jobbie-ink bg-jobbie-pink font-dmSans text-sm font-bold text-jobbie-ink">
                      {{ employerInitials(job.employer_name) }}
                    </div>
                    <span class="overflow-hidden text-ellipsis whitespace-nowrap font-dmSans text-sm font-bold leading-[1.1] text-black marketing:text-base">{{ job.employer_name || 'Zamestnávateľ' }}</span>
                  </div>
                  <AppIcon name="arrow-right" :size="22" class="shrink-0" />
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[110px]">
      <div class="box-border flex w-full max-w-[1400px] flex-col gap-8 px-5">
        <div class="flex flex-col gap-5 marketing:flex-row marketing:items-end marketing:justify-between">
          <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">Ako Jobbie funguje?</h2>
          <div
            class="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-2xl bg-white p-1.5 shadow-brutal"
            role="tablist"
            aria-label="Rola"
          >
            <button
              v-for="tab in homeCarouselTabs"
              :key="tab.role"
              type="button"
              role="tab"
              :aria-selected="homeCarouselRole === tab.role"
              class="is-clickable min-h-11 whitespace-nowrap rounded-xl border-none px-4 font-dmSans text-[15px] font-bold transition-[background-color,color] duration-200 marketing:px-5 marketing:text-[17px]"
              :class="homeCarouselRole === tab.role ? 'bg-jobbie-ink text-jobbie-lime' : 'bg-transparent text-jobbie-ink'"
              @click="selectHomeCarouselRole(tab.role)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
        <ol class="m-0 grid list-none grid-cols-1 gap-5 p-0 min-[700px]:grid-cols-3" aria-live="polite">
          <li
            v-for="(step, i) in homeSteps"
            :key="`${homeCarouselRole}-${i}`"
            class="flex flex-col gap-3 rounded-[20px] p-6 shadow-brutal marketing:p-8"
            :class="['bg-jobbie-lime', 'bg-white', 'bg-jobbie-pink'][i % 3]"
          >
            <span class="font-display text-[56px] font-extrabold leading-none text-jobbie-ink">{{ step.number }}</span>
            <h3 class="m-0 font-dmSans text-[22px] font-extrabold text-jobbie-ink marketing:text-2xl">{{ step.title }}</h3>
            <p class="m-0 font-dmSans text-base font-medium leading-relaxed text-jobbie-ink/80 marketing:text-[17px]">{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px]">
      <div class="box-border flex w-full max-w-[1400px] flex-col gap-12 px-5 marketing:flex-row marketing:items-center marketing:gap-16">
        <div class="w-full marketing:w-1/2">
          <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
            Tisíce ponúk. <br> <span class="text-marketing-green">Jeden web.</span>
          </h2>
          <p class="mb-0 mt-[10px] font-dmSans text-lg font-medium text-black/80 marketing:text-2xl">Ušetri si čas pri hľadaní pracovnej ponuky a začni zarábať čo najskôr</p>
          <ul class="m-0 mt-6 flex list-none flex-col gap-3 p-0">
            <li v-for="(point, i) in seekerPoints" :key="point" class="flex items-center gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-jobbie-ink bg-jobbie-lime font-dmSans text-lg font-bold text-jobbie-ink">{{ i + 1 }}</span>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-xl">{{ point }}</span>
            </li>
          </ul>
        </div>
        <div class="w-full pb-6 marketing:w-1/2">
          <HomeFeatureIllustration variant="seeker" />
        </div>
      </div>
    </section>

    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px]">
      <div class="box-border flex w-full max-w-[1400px] flex-col gap-12 px-5 marketing:flex-row marketing:items-center marketing:gap-16">
        <div class="order-2 w-full pb-6 marketing:order-none marketing:w-1/2">
          <HomeFeatureIllustration variant="employer" />
        </div>
        <div class="order-1 w-full marketing:order-none marketing:w-1/2">
          <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
            Tisíce uchádzačov. <br> <span class="text-marketing-green">Jeden inzerát.</span>
          </h2>
          <p class="mb-0 mt-[10px] font-dmSans text-lg font-medium text-black/80 marketing:text-2xl">Ušetri si čas pri hľadaní uchádzača.</p>
          <ul class="m-0 mt-6 flex list-none flex-col gap-3 p-0">
            <li v-for="(point, i) in employerPoints" :key="point" class="flex items-center gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-jobbie-ink bg-jobbie-pink font-dmSans text-lg font-bold text-jobbie-ink">{{ i + 1 }}</span>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-xl">{{ point }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="mt-[72px] flex w-full justify-center px-4 marketing:mt-[120px]">
      <div class="flex w-full max-w-[1360px] flex-col gap-8 rounded-[28px] bg-jobbie-ink p-7 shadow-[0_0_0_2px_#10231A,6px_6px_0_2px_#FF9ED2] marketing:flex-row marketing:items-center marketing:gap-12 marketing:p-16">
        <div class="flex min-w-0 flex-1 flex-col gap-4">
          <span class="w-fit rounded-full bg-jobbie-pink px-3 py-1 font-dmSans text-sm font-bold text-jobbie-ink">Jobbie</span>
          <h2 class="m-0 font-dmSans text-[32px] font-extrabold leading-[1.05] text-white marketing:text-[52px]">
            {{ homeCta.heading }}<span class="block text-jobbie-lime">{{ homeCta.highlight }}</span>
          </h2>
          <p class="m-0 font-dmSans text-[17px] font-medium text-[#D7E3DB] marketing:text-[22px]">{{ homeCta.sub }}</p>
          <div class="pt-2">
            <NuxtLink :to="homeCta.to" class="jb-btn jb-btn--lime text-lg marketing:text-xl">{{ homeCta.cta }}</NuxtLink>
          </div>
        </div>
        <ul class="m-0 flex min-w-0 list-none flex-col gap-3 p-0 marketing:w-[40%]">
          <li v-for="(point, i) in employerPoints" :key="`cta-${point}`" class="flex items-start gap-3 rounded-2xl bg-[#1D3A2C] px-5 py-4 font-dmSans text-base text-white">
            <span class="font-bold text-jobbie-lime">0{{ i + 1 }}</span>
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>
    </section>
    <HomeMarketingReviews v-if="HOME_MARKETING_REVIEWS_ENABLED" />
    <HomeMarketingBlogFaqNewsletter
      :carousel-tabs="homeCarouselTabs"
      :carousel-role="homeCarouselRole"
      :faq-items="homeFaqItems"
      :open-faq-index="openFaqIndex"
      @select-role="selectHomeCarouselRole"
      @toggle-faq="toggleFaq"
    />
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import {
  CATEGORIES,
  employerInitials,
  formatJobDateRange,
  getCategoryLabel,
  getJobCardPayDisplay,
  getJobCardThumbnailSrc,
} from '~/utils/job'
import type { Job } from '~/utils/job'
import {
  jobPhotoThumbnailSrcForStage,
  type JobPhotoThumbnailFallbackStage,
} from '~/utils/job-photo-url'
import { HOME_DESIGN_FAQ_BY_ROLE } from '~/utils/home-design-faq'
import { HOME_MARKETING_REVIEWS_ENABLED } from '~/utils/home-reviews'
import { HOME_DESIGN_CAROUSEL, type HomeDesignCarouselRole } from '~/utils/home-design-carousel'
import { usePageSeo } from '~/composables/usePageSeo'
import { fetchPublicJobsHome } from '~/utils/fetch-public-jobs-home'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildJobsAlternateFeeds } from '~/utils/seo-feed-links'
import { buildFaqPageJsonLd } from '~/utils/seo-json-ld'
definePageMeta({ layout: 'app' })

const route = useRoute()
const router = useRouter()
const promoCreditsBanner = ref<string | null>(null)

function readPromoCreditsFromQuery(): void {
  const raw = route.query.promo_credits
  const value = Array.isArray(raw) ? raw[0] : raw
  const credits = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(credits) || credits < 1) {
    promoCreditsBanner.value = null
    return
  }
  promoCreditsBanner.value = S.registrationPromoGrantedBanner.replace(
    '{credits}',
    String(credits),
  )
  const nextQuery = { ...route.query }
  delete nextQuery.promo_credits
  void router.replace({ path: route.path, query: nextQuery })
}

onMounted(() => {
  readPromoCreditsFromQuery()
})

const runtimeConfig = useRuntimeConfig()
const siteUrl = computed(() =>
  normalizeSiteUrl(String(runtimeConfig.public.siteUrl || '')),
)

const { data: initialHomeJobs } = await useAsyncData('home-jobs', () =>
  fetchPublicJobsHome(),
)

usePageSeo(() => {
  const site = siteUrl.value
  const faqLd = buildFaqPageJsonLd(HOME_DESIGN_FAQ_BY_ROLE.brigadnik)
  return {
    title: S.seoHomeTitle,
    description: S.seoHomeDescription,
    canonicalPath: ROUTES.home,
    alternateFeeds: site ? buildJobsAlternateFeeds(site) : [],
    jsonLd: faqLd,
  }
})

const HomeMarketingReviews = defineAsyncComponent(
  () => import('~/components/home/HomeMarketingReviews.vue'),
)
const HomeMarketingBlogFaqNewsletter = defineAsyncComponent(
  () => import('~/components/home/HomeMarketingBlogFaqNewsletter.vue'),
)

type HomeCtaKind = 'customer' | 'worker' | 'provider'

const { session, profile } = useAuth()
const homeCtaKind = ref<HomeCtaKind>('customer')
const openFaqIndex = ref<number | null>(null)

function listApplicableHomeCtaKinds(): HomeCtaKind[] {
  if (!session.value?.access_token || !profile.value) {
    return ['customer']
  }
  const p = profile.value
  const out: HomeCtaKind[] = []
  if (p.customer_role) out.push('customer')
  if (p.worker_role) out.push('worker')
  if (p.provider_role) out.push('provider')
  if (out.length === 0) out.push('customer')
  return out
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function pickHomeCtaKind(): void {
  const opts = listApplicableHomeCtaKinds()
  if (opts.length <= 1) {
    homeCtaKind.value = opts[0] ?? 'customer'
    return
  }
  const userId = profile.value?.id ?? session.value?.access_token ?? ''
  homeCtaKind.value = opts[hashString(userId) % opts.length]!
}

watch(
  () =>
    [
      session.value?.access_token ?? '',
      profile.value?.id ?? '',
      profile.value?.customer_role,
      profile.value?.worker_role,
      profile.value?.provider_role,
    ] as const,
  () => {
    if (!import.meta.client) return
    pickHomeCtaKind()
  },
)

onMounted(() => {
  pickHomeCtaKind()
})

const homeCta = computed(() => {
  const k = homeCtaKind.value
  if (k === 'worker') {
    return {
      heading: S.homeWorkerCtaHeading,
      highlight: S.homeWorkerCtaHighlight,
      sub: S.homeWorkerCtaSub,
      cta: S.homeWorkerCtaButton,
      to: ROUTES.find,
    }
  }
  if (k === 'provider') {
    return {
      heading: S.homeProviderCtaHeading,
      highlight: S.homeProviderCtaHighlight,
      sub: S.homeProviderCtaSub,
      cta: S.homeProviderCtaButton,
      to: ROUTES.myAds,
    }
  }
  return {
    heading: S.homeEmployerCtaHeading,
    highlight: S.homeEmployerCtaHighlight,
    sub: S.homeEmployerCtaSub,
    cta: S.homePostJobCta,
    to: ROUTES.jobHub,
  }
})

const { api } = useApi()

const latestJobs = ref<Job[]>(initialHomeJobs.value?.latest ?? [])
const latestJobsSectionRef = ref<HTMLElement | null>(null)
const gridJobs = ref<Job[]>(initialHomeJobs.value?.grid ?? [])
const thumbFallbackStages = ref<Record<string, JobPhotoThumbnailFallbackStage>>({})
const loadingGrid = ref(!initialHomeJobs.value)
const categoryJobCounts = ref<Record<string, number>>(
  initialHomeJobs.value?.categoryCounts ?? {},
)

const HOME_LATEST_LIMIT = 4
const HOME_GRID_LIMIT = 8

function thumbSrc(job: Job): string {
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

watch(gridJobs, (list) => {
  const ids = new Set(list.map((job) => job.id))
  const next = { ...thumbFallbackStages.value }
  for (const id of Object.keys(next)) {
    if (!ids.has(id)) {
      delete next[id]
    }
  }
  thumbFallbackStages.value = next
})

const homeCarouselTabs: readonly { role: HomeDesignCarouselRole; label: string }[] = [
  { role: 'zamestnavatel', label: 'Zamestnávateľ' },
  { role: 'brigadnik', label: 'Uchádzač' },
  { role: 'profesional', label: 'Profesionál' },
]
const homeCarouselRole = ref<HomeDesignCarouselRole>('zamestnavatel')
const homeFaqItems = computed(() => HOME_DESIGN_FAQ_BY_ROLE[homeCarouselRole.value])
const homeCarouselSlides = computed(() => HOME_DESIGN_CAROUSEL[homeCarouselRole.value])
function selectHomeCarouselRole(role: HomeDesignCarouselRole): void {
  homeCarouselRole.value = role
}

/** "Ako Jobbie funguje" step cards — titles in the data start with "1. ", the number is shown separately. */
const homeSteps = computed(() =>
  homeCarouselSlides.value.map((slide, i) => ({
    number: String(i + 1).padStart(2, '0'),
    title: slide.title.replace(/^\d+\.\s*/, ''),
    text: slide.text,
  })),
)

const homeTrustItems = [
  { value: 'Zadarmo', label: 'pre uchádzačov' },
  { value: '1 klik', label: 'a prihláška je odoslaná' },
  { value: 'Hodnotenia', label: 'firiem aj uchádzačov' },
  { value: 'Chat', label: 'priamo v Jobbie' },
] as const

const seekerPoints = [
  'Stovky pracovných ponúk na jednom mieste',
  'Jednoduché vyhľadávanie podľa tvojich preferencií',
  'Hodnotenia pre lepšiu dôveryhodnosť',
] as const

const employerPoints = [
  'Oslovte tisíce overených uchádzačov',
  'Jednoduché spravovanie prihlášok',
  'Rýchle obsadenie pozície do 48 hodín',
] as const

const CATEGORY_TILE_CLASSES: Record<string, string> = {
  stavba: 'bg-jobbie-lime',
  domacnost: 'bg-jobbie-pink',
  zahrada: 'bg-[#7FE3B8]',
  stahovanie: 'bg-[#9FD8FF]',
  sklad: 'bg-[#FFD24D]',
  eventy: 'bg-[#C6B6FF]',
  starostlivost: 'bg-[#FFA877]',
  gastro: 'bg-jobbie-lime',
  auto: 'bg-jobbie-pink',
  ine: 'bg-white',
}

function categoryTileClass(cat: string): string {
  return CATEGORY_TILE_CLASSES[cat] ?? 'bg-white'
}

watch(homeCarouselRole, () => {
  openFaqIndex.value = null
})

function categoryJobCount(cat: (typeof CATEGORIES)[number]): number {
  return categoryJobCounts.value[cat] ?? 0
}

useJobsFeedSocket(latestJobs, HOME_LATEST_LIMIT, { sectionRef: latestJobsSectionRef })

async function fetchLatestJobs(): Promise<void> {
  const res = await api<Job[]>('/api/jobs/latest', {
    query: { limit: String(HOME_LATEST_LIMIT) },
    skipSessionExpiry: true,
  })
  if (res.ok && Array.isArray(res.data)) {
    latestJobs.value = res.data
  } else {
    latestJobs.value = []
  }
}

async function fetchGridJobs(): Promise<void> {
  const res = await api<Job[]>('/api/jobs', {
    query: {
      limit: String(HOME_GRID_LIMIT),
      offset: '0',
      is_active: 'true',
      sort: 'date_desc',
    },
  })
  if (res.ok && Array.isArray(res.data)) {
    gridJobs.value = res.data
    if (res.data.length > 0 && session.value?.access_token) {
      api('/api/jobs/impressions', { method: 'POST', body: { job_ids: res.data.map((j) => j.id) } }).catch(() => {})
    }
  } else {
    gridJobs.value = []
  }
}

async function fetchCategoryJobCounts(): Promise<void> {
  const res = await api<Record<string, number>>('/api/jobs/category-counts', {
    skipSessionExpiry: true,
  })
  if (!res.ok || !res.data || typeof res.data !== 'object' || Array.isArray(res.data)) {
    return
  }
  categoryJobCounts.value = res.data
}

function toggleFaq(index: number): void {
  openFaqIndex.value = openFaqIndex.value === index ? null : index
}

watch(initialHomeJobs, (data) => {
  if (!data) return
  if (data.latest.length) latestJobs.value = data.latest
  if (data.grid.length) gridJobs.value = data.grid
  if (Object.keys(data.categoryCounts).length) {
    categoryJobCounts.value = data.categoryCounts
  }
  loadingGrid.value = false
})

onMounted(async () => {
  if (!initialHomeJobs.value) {
    loadingGrid.value = true
    await Promise.all([fetchLatestJobs(), fetchGridJobs(), fetchCategoryJobCounts()])
    loadingGrid.value = false
  } else if (Object.keys(categoryJobCounts.value).length === 0) {
    await fetchCategoryJobCounts()
  }
})
</script>
