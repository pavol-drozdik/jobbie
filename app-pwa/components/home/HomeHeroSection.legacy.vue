<!--
  Rollback reference: previous green-gradient homepage hero (pre A/B redesign).
  Swap into pages/index.vue if reverting: <HomeHeroSectionLegacy ...props />
-->
<template>
  <section class="mt-[30px] mx-[10px] flex w-[calc(100%-20px)] items-center justify-center marketing:mt-[30px] marketing:mx-0 marketing:w-full">
    <div
      class="relative mx-4 flex w-full max-w-[1600px] flex-col gap-6 rounded-[30px] bg-[linear-gradient(155deg,rgb(21,128,61)_0%,rgb(34,197,94)_100%)] px-6 pt-8 pb-0 marketing:min-h-[420px] marketing:flex-row marketing:items-stretch marketing:gap-0 marketing:p-[70px]"
    >
      <div class="w-full py-6 marketing:w-1/2 marketing:py-20">
        <h1 class="mb-4 mt-0 font-dmSans text-[40px] font-extrabold leading-[1.05] text-white marketing:mb-5 marketing:text-[64px] marketing:leading-none marketingXl:text-[80px] marketingXl:leading-[80px]">
          Nájdi brigádu. <br> Bez stresu. Ihneď.
        </h1>
        <p class="m-0 font-dmSans text-lg font-medium text-white/80 marketing:text-2xl marketingXl:text-[28px]">
          Jobbie spája ľudí s firmami rýchlo a jednoducho. Prihlásiš sa dnes, pracuješ zajtra.
        </p>
        <form class="mt-5 flex items-center rounded-full bg-[#f9fcfa] py-2.5 pl-5 pr-2.5" @submit.prevent="goFindWithSearch">
          <input
            v-model="homeSearchQuery"
            type="search"
            placeholder="Aká brigáda?"
            enterkeyhint="search"
            autocomplete="off"
            class="h-10 w-full border-none bg-transparent font-dmSans text-lg font-medium outline-none"
          >
          <button type="submit" class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-marketing-green text-white" :aria-label="S.navHladat">
            <AppIcon name="search" :size="18" class="text-white" />
          </button>
        </form>
        <div
          v-if="heroSearchBarChips.length > 0"
          class="mt-6 -mx-6 min-w-0 marketing:-mx-[70px]"
          role="region"
          :aria-label="chipsRegionLabel"
        >
          <div
            ref="recentChipsScrollRef"
            class="flex cursor-grab touch-pan-x flex-nowrap gap-3 overflow-x-auto overscroll-x-contain px-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] select-none active:cursor-grabbing marketing:px-[70px] [&::-webkit-scrollbar]:hidden"
            @pointerdown="onRecentChipsScrollPointerDown"
          >
            <NuxtLink
              v-for="chip in heroSearchBarChips"
              :key="chip.key"
              :to="{ path: ROUTES.find, query: chip.query }"
              class="inline-flex w-fit shrink-0 items-center justify-center gap-2.5 rounded-full bg-white/20 px-4 py-2.5 font-dmSans text-base font-medium text-white no-underline"
            >
              <CategoryIcon
                v-if="chip.categorySlug"
                :category="chip.categorySlug"
                :size="16"
                icon-class="shrink-0 text-white"
              />
              <AppIcon v-else :name="chip.iconName ?? 'briefcase'" :size="16" />
              <span>{{ chip.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
      <div
        class="hero-visual-column relative flex min-h-[280px] w-full items-center justify-center pt-6 pb-0 marketing:absolute marketing:inset-y-0 marketing:right-0 marketing:w-1/2 marketing:min-h-0 marketing:p-0"
      >
        <div class="hero-phone-stage">
          <NuxtImg
            :src="HERO_PHONE_SRC_MOBILE"
            :srcset="`${HERO_PHONE_SRC_MOBILE} 400w, ${HERO_PHONE_SRC_DESKTOP} 800w`"
            sizes="(min-width: 900px) 800px, 100vw"
            alt=""
            width="400"
            :height="HERO_PHONE_IMG_HEIGHT_AT_400"
            fit="inside"
            format="webp"
            quality="85"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            class="relative z-[1] block h-auto w-full"
            @error="onHeroPhonePictureImgError"
          />
        </div>
        <div
          v-if="heroJob"
          class="hero-pill hero-pill--new flex w-fit max-w-[min(11rem,calc(100%-1rem))] items-center justify-center gap-2 rounded-lg bg-marketing-soft p-2 text-[#111] shadow-[4px_4px_4px_0px_rgba(0,0,0,0.2)] marketing:max-w-none marketing:p-2.5"
        >
          <span class="flex shrink-0 text-marketing-green">
            <AppIcon name="bolt" :size="18" />
          </span>
          <span class="m-0 font-dmSans text-sm font-medium marketing:text-base marketingXl:text-xl">Nová ponuka!</span>
        </div>
        <div
          v-if="heroJob"
          class="hero-pill hero-pill--rate flex w-fit max-w-[min(9rem,calc(100%-1rem))] items-center justify-center gap-2 rounded-lg bg-marketing-soft p-2 text-[#111] shadow-[4px_4px_4px_0px_rgba(0,0,0,0.2)] marketing:max-w-none marketing:p-2.5"
        >
          <span class="flex shrink-0 text-marketing-green">
            <AppIcon name="currency" :size="18" />
          </span>
          <span class="m-0 font-dmSans text-sm font-medium marketing:text-base marketingXl:text-xl">6,70€/hod.</span>
        </div>
        <div
          v-if="heroJob"
          class="hero-pill hero-pill--loc flex w-fit max-w-[min(12rem,calc(100%-1.5rem))] items-center justify-center gap-2 rounded-lg bg-marketing-soft p-2 text-[#111] shadow-[4px_4px_4px_0px_rgba(0,0,0,0.2)] marketing:max-w-none marketing:p-2.5"
        >
          <span class="flex shrink-0 text-marketing-green">
            <AppIcon name="map-pin" :size="18" />
          </span>
          <span class="m-0 min-w-0 truncate font-dmSans text-sm font-medium marketing:text-base marketingXl:text-xl">{{ heroLocation }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { AppIconName } from '~/utils/app-icons'
import type { Job } from '~/utils/job'
import { createEmptyFindSnapshot, pushRecentFindFilter } from '~/utils/recent-find-filters'

export type HomeHeroSearchChip = {
  key: string
  query: Record<string, string>
  label: string
  categorySlug?: string
  iconName?: AppIconName
}

defineProps<{
  heroJob: Job | null
  heroLocation: string
  heroSearchBarChips: HomeHeroSearchChip[]
  chipsRegionLabel: string
}>()

const HERO_PHONE_SRC_MOBILE = '/img/heroiphone2.png'
const HERO_PHONE_SRC_DESKTOP = '/img/heroiphone1.png'
const HERO_PHONE_IMG_HEIGHT_AT_400 = Math.round((400 * 1406) / 1027)

useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: HERO_PHONE_SRC_MOBILE,
      media: '(max-width: 899px)',
      fetchpriority: 'high',
    },
    {
      rel: 'preload',
      as: 'image',
      href: HERO_PHONE_SRC_DESKTOP,
      media: '(min-width: 900px)',
      fetchpriority: 'high',
    },
  ],
})

let heroPhoneImgErrorRetries = 0

function onHeroPhonePictureImgError(payload: string | Event): void {
  if (typeof payload === 'string') return
  const el = payload.target
  if (!el || !(el instanceof HTMLImageElement)) return
  if (import.meta.server) return
  if (heroPhoneImgErrorRetries >= 2) return
  heroPhoneImgErrorRetries += 1
  try {
    const resolved = new URL(el.currentSrc || el.src, window.location.href)
    resolved.searchParams.set('retry', String(heroPhoneImgErrorRetries))
    el.src = `${resolved.pathname}${resolved.search}`
  } catch {
    el.src = `${HERO_PHONE_SRC_MOBILE}?retry=${heroPhoneImgErrorRetries}`
  }
}

const router = useRouter()
const homeSearchQuery = ref('')
const recentChipsScrollRef = ref<HTMLElement | null>(null)
let recentChipsDragPointerId = -1
let recentChipsDragStartClientX = 0
let recentChipsDragStartScrollLeft = 0
let recentChipsDragMoved = false

function goFindWithSearch(): void {
  const q = homeSearchQuery.value.trim()
  if (q.length > 0) {
    pushRecentFindFilter({ ...createEmptyFindSnapshot(), search: q })
    void router.push({ path: ROUTES.find, query: { q } })
    return
  }
  void router.push(ROUTES.find)
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

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    unbindRecentChipsDragWindowListeners()
  }
})
</script>

<style scoped>
.hero-phone-stage {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: min(280px, calc(100vw - 3rem));
  margin-inline: auto;
}
@media (min-width: 400px) {
  .hero-phone-stage {
    max-width: min(300px, calc(100vw - 2.5rem));
  }
}
@media (min-width: 520px) and (max-width: 899px) {
  .hero-phone-stage {
    max-width: min(340px, 82vw);
  }
}
@media (min-width: 900px) {
  .hero-phone-stage img {
    filter: drop-shadow(10px 10px 4px rgba(0, 0, 0, 0.37));
  }
}
@media (min-width: 900px) {
  .hero-phone-stage {
    position: absolute;
    left: 50%;
    bottom: -3%;
    z-index: 1;
    transform: translateX(-50%);
    width: min(350px, 100%);
    max-width: 350px;
    margin-inline: 0;
  }
}
.hero-visual-column {
  --hero-pill-t: calc(clamp(0, (min(900px, max(400px, 100vw)) - 400px) / 1px, 500) / 500);
}
.hero-pill {
  position: absolute;
  z-index: 2;
}
.hero-pill--new {
  left: calc((4 + 11 * var(--hero-pill-t, 0)) * 1%);
  top: calc((4 + 21 * var(--hero-pill-t, 0)) * 1%);
}
.hero-pill--rate {
  right: calc((4 + 21 * var(--hero-pill-t, 0)) * 1%);
  top: calc((18 + 32 * var(--hero-pill-t, 0)) * 1%);
}
.hero-pill--loc {
  left: calc((8 + 12 * var(--hero-pill-t, 0)) * 1%);
  bottom: calc((8 + 4 * var(--hero-pill-t, 0)) * 1%);
}
</style>
