<template>
  <div>
    <HomeHeroSection />
    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
      <div class="flex w-full flex-col items-center gap-10">
        <h2 class="mt-0 text-center font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:mb-5 marketingXl:text-[60px] marketingXl:leading-[60px]">
          Ako Jobbie Funguje
        </h2>
        <div
          class="mx-[10px] flex w-fit max-w-full flex-wrap items-center justify-center rounded-[999px] bg-white p-1.5 shadow-[0_0_3px_0_rgba(0,0,0,0.2)] marketing:rounded-full"
          role="tablist"
          aria-label="Rola"
        >
          <button
            v-for="tab in homeCarouselTabs"
            :key="tab.role"
            type="button"
            role="tab"
            :aria-selected="homeCarouselRole === tab.role"
            class="m-1 cursor-pointer whitespace-nowrap rounded-full border-none bg-transparent px-3 py-2 font-dmSans text-[15px] font-bold text-black transition-[background-color,color] duration-200 max-[600px]:px-3 max-[600px]:py-2 marketing:m-[5px] marketing:px-5 marketing:py-2.5 marketing:text-[22px] aria-selected:bg-marketing-green aria-selected:text-white"
            :class="homeCarouselRole === tab.role ? 'bg-marketing-green text-white' : ''"
            @click="selectHomeCarouselRole(tab.role)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div ref="homeCarouselEl" class="w-full touch-pan-y overflow-hidden">
          <div
            ref="homeCarouselTrackRef"
            class="flex gap-[30px] will-change-transform"
            :style="{ transform: `translateX(${homeCarouselTranslatePx}px)`, transition: homeCarouselTransition }"
            @touchstart.passive="onHomeCarouselTouchStart"
            @touchmove="onHomeCarouselTouchMove"
            @touchend="onHomeCarouselTouchEnd"
          >
            <div
              v-for="(slide, i) in homeCarouselSlides"
              :key="`${homeCarouselRole}-${i}`"
              data-home-carousel-card
              class="flex min-h-0 w-[min(700px,calc(100vw-48px))] min-w-[min(700px,calc(100vw-48px))] shrink-0 flex-col gap-3 rounded-[20px] border border-black/5 bg-marketing-panel p-6 max-[600px]:p-5 marketing:w-[700px] marketing:min-w-[700px] marketing:gap-4 marketing:p-10"
            >
              <h3 class="m-0 font-dmSans text-[22px] font-extrabold text-black max-[600px]:text-[22px] marketing:text-[34px] marketingXl:text-4xl">
                {{ slide.title }}
              </h3>
              <p class="m-0 text-base font-medium text-black/80 max-[600px]:text-base marketing:text-[22px] marketingXl:text-2xl">
                {{ slide.text }}
              </p>
            </div>
          </div>
        </div>
        <div class="mt-6 flex items-center justify-center gap-2.5">
          <button
            type="button"
            class="mr-2 flex size-11 min-w-[44px] cursor-pointer items-center justify-center rounded-full border-none bg-marketing-green text-white"
            aria-label="Predchádzajúce"
            @click="homeCarouselGoDelta(-1)"
          >
            <AppIcon name="chevron-left" :size="20" class="text-white" />
          </button>
          <button
            v-for="(_, i) in homeCarouselSlides"
            :key="`dot-${i}`"
            type="button"
            class="h-2.5 cursor-pointer rounded-full border-none bg-black/20 p-0 transition-[background-color,width] duration-[250ms] ease-in-out"
            :class="i === homeCarouselIndex ? 'w-7 bg-marketing-green' : 'w-2.5'"
            :aria-label="`Slide ${i + 1}`"
            @click="homeCarouselGoTo(i, true)"
          />
          <button
            type="button"
            class="ml-2 flex size-11 min-w-[44px] cursor-pointer items-center justify-center rounded-full border-none bg-marketing-green text-white"
            aria-label="Ďalšie"
            @click="homeCarouselGoDelta(1)"
          >
            <AppIcon name="chevron-right" :size="20" class="text-white" />
          </button>
        </div>
      </div>
    </section>
    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
      <div class="box-border flex w-full max-w-[1400px] flex-col gap-6 px-5 marketing:flex-row marketing:items-center">
        <div class="w-full marketing:w-1/2">
          <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
            Tisíce ponúk. <br> <span class="text-marketing-green">Jeden web.</span>
          </h2>
          <p class="mb-0 mt-[10px] font-dmSans text-lg font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Ušetri si čas pri hľadaní pracovnej ponuky a začni zarábať čo najskôr</p>
          <div class="mt-5 flex flex-col gap-2.5">
            <div class="flex items-center gap-2.5">
              <div class="flex aspect-square h-10 min-w-10 items-center justify-center rounded-full bg-marketing-green font-dmSans text-xl font-bold text-white/80 marketing:h-[45px] marketing:min-w-[45px] marketing:text-[26px]">
                1.
              </div>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Stovky pracovných ponúk na jednom mieste</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="flex aspect-square h-10 min-w-10 items-center justify-center rounded-full bg-marketing-green font-dmSans text-xl font-bold text-white/80 marketing:h-[45px] marketing:min-w-[45px] marketing:text-[26px]">
                2.
              </div>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Jednoduché vyhľadávanie podľa tvojich preferencií</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="flex aspect-square h-10 min-w-10 items-center justify-center rounded-full bg-marketing-green font-dmSans text-xl font-bold text-white/80 marketing:h-[45px] marketing:min-w-[45px] marketing:text-[26px]">
                3.
              </div>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Hodnotenia pre lepšiu dôveryhodnosť</span>
            </div>
          </div>
        </div>
        <div class="w-full marketing:w-1/2">
          <img
            class="mx-auto block w-full rounded-[20px] object-contain marketing:w-[90%]"
            src="/img/phone-image.png"
            alt=""
            loading="lazy"
            width="800"
            height="600"
          >
        </div>
      </div>
    </section>
    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
      <div class="box-border flex w-full max-w-[1400px] flex-col gap-6 px-5 marketing:flex-row marketing:items-center">
        <div class="order-2 w-full marketing:order-none marketing:w-1/2">
          <img
            class="mx-auto block w-full rounded-[20px] object-contain marketing:w-[90%]"
            src="/img/spotlight.png"
            alt=""
            loading="lazy"
            width="800"
            height="600"
          >
        </div>
        <div class="order-1 w-full marketing:order-none marketing:w-1/2">
          <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
            Tisíce uchádzačov. <br> <span class="text-marketing-green">Jeden inzerát.</span>
          </h2>
          <p class="mb-0 mt-[10px] font-dmSans text-lg font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Ušetri si čas pri hľadaní uchádzača.</p>
          <div class="mt-5 flex flex-col gap-2.5">
            <div class="flex items-center gap-2.5">
              <div class="flex aspect-square h-10 min-w-10 items-center justify-center rounded-full bg-marketing-green font-dmSans text-xl font-bold text-white/80 marketing:h-[45px] marketing:min-w-[45px] marketing:text-[26px]">
                1.
              </div>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Oslovte tisíce overených uchádzačov</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="flex aspect-square h-10 min-w-10 items-center justify-center rounded-full bg-marketing-green font-dmSans text-xl font-bold text-white/80 marketing:h-[45px] marketing:min-w-[45px] marketing:text-[26px]">
                2.
              </div>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Jednoduché spravovanie prihlášok</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="flex aspect-square h-10 min-w-10 items-center justify-center rounded-full bg-marketing-green font-dmSans text-xl font-bold text-white/80 marketing:h-[45px] marketing:min-w-[45px] marketing:text-[26px]">
                3.
              </div>
              <span class="font-dmSans text-[17px] font-medium text-black/80 marketing:text-2xl marketingXl:text-[28px]">Rýchle obsadenie pozície do 48 hodín</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
      <div class="box-border w-full max-w-[1400px] px-5">
        <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
          Kategórie
        </h2>
        <div class="mt-8 grid w-full max-w-[1400px] grid-cols-1 gap-4 min-[600px]:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="cat in CATEGORIES"
            :key="cat"
            :to="`${ROUTES.find}?category=${cat}`"
            class="flex items-center gap-2.5 rounded-[10px] bg-marketing-surface p-3 text-inherit no-underline shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)] transition-transform duration-150 hover:-translate-y-0.5"
          >
            <span class="flex text-marketing-green">
              <CategoryIcon :category="cat" :size="30" />
            </span>
            <div class="flex min-w-0 flex-col gap-1">
              <span class="m-0 font-dmSans text-lg font-bold leading-[1.1] text-black/80 marketing:text-[22px] marketing:leading-[22px]">{{ getCategoryLabel(cat) }}</span>
              <span class="m-0 font-dmSans text-sm font-medium leading-snug text-marketing-muted marketing:text-base marketing:leading-[26px]">{{ categoryJobCount(cat) }} aktuálnych ponúk</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
    <section ref="latestJobsSectionRef" class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
      <div class="box-border w-full max-w-[1400px] px-5">
        <div class="mb-8 flex w-full flex-col items-start gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="mb-0 mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
              Aktuálne<span class="text-marketing-green"> ponuky</span>
            </h2>
            <p class="m-0 text-[17px] font-medium text-black/65 marketing:text-[22px]">Najnovšie ponuky pripravené priamo pre teba</p>
          </div>
          <AppButton
            variant="primary"
            size="md"
            :to="ROUTES.find"
            class="px-[18px] py-2.5 text-[17px] marketing:text-xl"
          >Zobraziť všetky ponuky</AppButton>
        </div>
        <div class="w-full">
          <div v-if="loadingGrid" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div v-for="n in 8" :key="n" class="overflow-hidden rounded-[15px] bg-marketing-surface shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]">
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
              class="block min-w-0 overflow-hidden rounded-[15px] bg-marketing-surface text-inherit no-underline shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)]"
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
                    <div class="flex size-10 min-w-10 items-center justify-center rounded-full bg-violet-600 font-dmSans text-sm font-bold text-white">
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
    <section class="mt-[72px] flex w-full justify-center marketing:mt-[120px] marketingXl:mt-[140px]">
      <div class="mx-4 w-[calc(100%-32px)] max-w-[1360px] rounded-[20px] bg-marketing-green p-7 px-7 marketing:p-[70px] marketing:pl-[100px] marketing:pr-[100px]">
      <h2 class="text-center font-dmSans text-[28px] font-extrabold leading-[1.15] text-white marketing:text-left marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
        {{ homeCta.heading }}<span class="block text-white lg:inline lg:pl-1">{{ homeCta.highlight }}</span>
      </h2>

      <p class="mb-4 mt-0 text-center font-dmSans text-[17px] font-medium text-white/80 marketing:mb-5 marketing:text-left marketing:text-2xl marketingXl:text-[28px]">
        {{ homeCta.sub }}
      </p>
        <div class="flex justify-center pt-[20px]">
          <AppButton
            variant="outline"
            size="lg"
            :to="homeCta.to"
            class="!h-auto min-h-12 border-0 bg-white px-6 py-3 text-lg text-marketing-green hover:bg-white/90 marketing:min-h-14 marketing:px-8 marketing:py-3.5 marketing:text-2xl"
          >
            {{ homeCta.cta }}
          </AppButton>
        </div>
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
import { fetchPublicJobsHome } from '~/composables/fetch-public-jobs-home'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildJobsAlternateFeeds } from '~/utils/seo-feed-links'
import { buildFaqPageJsonLd } from '~/utils/seo-json-ld'
definePageMeta({ layout: 'app' })

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

function pickHomeCtaKind(): void {
  const opts = listApplicableHomeCtaKinds()
  homeCtaKind.value = opts[Math.floor(Math.random() * opts.length)]!
}

watch(
  () =>
    [
      session.value?.access_token ?? '',
      profile.value?.customer_role,
      profile.value?.worker_role,
      profile.value?.provider_role,
    ] as const,
  () => {
    pickHomeCtaKind()
  },
  { immediate: true },
)

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
const categoryJobCounts = ref<Record<string, number>>({})

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

const HOME_CAROUSEL_GAP_PX = 30
const homeCarouselTabs: readonly { role: HomeDesignCarouselRole; label: string }[] = [
  { role: 'zamestnavatel', label: 'Zamestnávateľ' },
  { role: 'brigadnik', label: 'Uchádzač' },
  { role: 'profesional', label: 'Profesionál' },
]
const homeCarouselRole = ref<HomeDesignCarouselRole>('zamestnavatel')
const homeFaqItems = computed(() => HOME_DESIGN_FAQ_BY_ROLE[homeCarouselRole.value])
const homeCarouselIndex = ref(0)
const homeCarouselTrackRef = ref<HTMLElement | null>(null)
const homeCarouselEl = ref<HTMLElement | null>(null)
const homeCarouselTranslatePx = ref(0)
const homeCarouselTransition = ref('none')
const homeCarouselSlides = computed(() => HOME_DESIGN_CAROUSEL[homeCarouselRole.value])
let hcDragStartX = 0
let hcDragDelta = 0
let hcIsDragging = false
let hcIsHorizontal: boolean | null = null

function homeCarouselCardWidth(): number {
  const el = homeCarouselTrackRef.value?.querySelector('[data-home-carousel-card]')
  if (el instanceof HTMLElement) return el.offsetWidth
  return 700
}

function homeCarouselGetOffset(index: number): number {
  const container = homeCarouselEl.value
  const w = homeCarouselCardWidth()
  const cw = container ? container.offsetWidth : 0
  return cw / 2 - w / 2 - index * (w + HOME_CAROUSEL_GAP_PX)
}

function homeCarouselGoTo(index: number, animate: boolean): void {
  const n = homeCarouselSlides.value.length
  const idx = ((index % n) + n) % n
  homeCarouselIndex.value = idx
  homeCarouselTransition.value = animate ? 'transform 0.5s ease' : 'none'
  homeCarouselTranslatePx.value = homeCarouselGetOffset(idx)
}

function homeCarouselGoDelta(delta: number): void {
  homeCarouselGoTo(homeCarouselIndex.value + delta, true)
}

function selectHomeCarouselRole(role: HomeDesignCarouselRole): void {
  homeCarouselRole.value = role
  homeCarouselIndex.value = 0
}

function onHomeCarouselResize(): void {
  homeCarouselGoTo(homeCarouselIndex.value, false)
}

watch(homeCarouselRole, () => {
  openFaqIndex.value = null
  requestAnimationFrame(() => homeCarouselGoTo(0, false))
})

function onHomeCarouselTouchStart(e: TouchEvent): void {
  const t = e.touches[0]
  if (!t) return
  hcDragStartX = t.clientX
  hcDragDelta = 0
  hcIsDragging = true
  hcIsHorizontal = null
  homeCarouselTransition.value = 'none'
}

function onHomeCarouselTouchMove(e: TouchEvent): void {
  if (!hcIsDragging) return
  const t = e.touches[0]
  if (!t) return
  const dx = t.clientX - hcDragStartX
  if (hcIsHorizontal === null) {
    hcIsHorizontal = Math.abs(dx) > 8
  }
  if (!hcIsHorizontal) return
  e.preventDefault()
  hcDragDelta = dx
  homeCarouselTranslatePx.value = homeCarouselGetOffset(homeCarouselIndex.value) + hcDragDelta
}

function onHomeCarouselTouchEnd(): void {
  if (!hcIsDragging) return
  hcIsDragging = false
  const THRESHOLD = 60
  if (hcDragDelta < -THRESHOLD) {
    homeCarouselGoDelta(1)
  } else if (hcDragDelta > THRESHOLD) {
    homeCarouselGoDelta(-1)
  } else {
    homeCarouselGoTo(homeCarouselIndex.value, true)
  }
  hcDragDelta = 0
}

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
  loadingGrid.value = false
})

onMounted(async () => {
  if (!initialHomeJobs.value) {
    loadingGrid.value = true
    await Promise.all([fetchLatestJobs(), fetchGridJobs()])
    loadingGrid.value = false
  }
  await fetchCategoryJobCounts()
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* ignore */
    }
  }
  requestAnimationFrame(() => homeCarouselGoTo(0, false))
  window.addEventListener('resize', onHomeCarouselResize)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onHomeCarouselResize)
  }
})
</script>
