<template>
  <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
    <div class="box-border w-full max-w-[1400px] px-5">
      <h2 class="mt-0 text-center font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:mb-5 marketingXl:text-[60px] marketingXl:leading-[60px]">
        Čo hovoria naši <br><span class="text-marketing-green">používatelia</span>
      </h2>
    </div>
    <div class="flex w-full flex-col gap-5 overflow-hidden" style="margin-top: 40px">
      <div class="w-full overflow-hidden">
        <div
          ref="reviewsTrackARef"
          class="flex w-max items-stretch gap-5 will-change-transform"
          :style="{ transform: `translateX(${-reviewsPosA}px)` }"
        >
          <div
            v-for="(r, i) in reviewsDuplicatedA"
            :key="`ra-${i}`"
            class="flex w-[min(500px,85vw)] min-w-[min(500px,85vw)] flex-col justify-start gap-3.5 rounded-[20px] border border-black/5 bg-marketing-panel p-7 marketing:gap-4 marketing:p-10"
          >
            <div class="flex items-center gap-3.5">
              <div
                class="flex size-[52px] min-w-[52px] items-center justify-center rounded-full bg-violet-600 font-dmSans text-[22px] font-bold text-white marketing:size-14 marketing:min-w-14 marketing:text-[28px]"
              >{{ r.initials }}</div>
              <div class="font-dmSans text-xl font-bold leading-[1.1] text-black marketing:text-[26px]">{{ r.name }}</div>
            </div>
            <div class="flex gap-1 text-marketing-green" aria-hidden="true">
              <AppIcon
                v-for="s in 5"
                :key="s"
                name="star"
                :size="18"
                :class="s <= r.rating ? 'text-marketing-green' : 'text-marketing-green/35'"
              />
            </div>
            <p class="m-0 text-[17px] font-medium leading-[1.45] text-black/80 marketing:text-[22px] marketingXl:text-2xl">"{{ r.quote }}"</p>
          </div>
        </div>
      </div>
      <div class="w-full overflow-hidden">
        <div
          ref="reviewsTrackBRef"
          class="flex w-max items-stretch gap-5 will-change-transform"
          :style="{ transform: `translateX(${-reviewsPosB}px)` }"
        >
          <div
            v-for="(r, i) in reviewsDuplicatedB"
            :key="`rb-${i}`"
            class="flex w-[min(500px,85vw)] min-w-[min(500px,85vw)] flex-col justify-start gap-3.5 rounded-[20px] border border-black/5 bg-marketing-panel p-7 marketing:gap-4 marketing:p-10"
          >
            <div class="flex items-center gap-3.5">
              <div
                class="flex size-[52px] min-w-[52px] items-center justify-center rounded-full bg-violet-600 font-dmSans text-[22px] font-bold text-white marketing:size-14 marketing:min-w-14 marketing:text-[28px]"
              >{{ r.initials }}</div>
              <div class="font-dmSans text-xl font-bold leading-[1.1] text-black marketing:text-[26px]">{{ r.name }}</div>
            </div>
            <div class="flex gap-1 text-marketing-green" aria-hidden="true">
              <AppIcon
                v-for="s in 5"
                :key="s"
                name="star"
                :size="18"
                :class="s <= r.rating ? 'text-marketing-green' : 'text-marketing-green/35'"
              />
            </div>
            <p class="m-0 text-[17px] font-medium leading-[1.45] text-black/80 marketing:text-[22px] marketingXl:text-2xl">"{{ r.quote }}"</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { HOME_REVIEWS_ROW_A, HOME_REVIEWS_ROW_B, type HomeReviewEntry } from '~/utils/home-reviews'

const reviewsDuplicatedA = computed((): HomeReviewEntry[] => [
  ...HOME_REVIEWS_ROW_A,
  ...HOME_REVIEWS_ROW_A,
])
const reviewsDuplicatedB = computed((): HomeReviewEntry[] => [
  ...HOME_REVIEWS_ROW_B,
  ...HOME_REVIEWS_ROW_B,
])
const reviewsTrackARef = ref<HTMLElement | null>(null)
const reviewsTrackBRef = ref<HTMLElement | null>(null)
const reviewsPosA = ref(0)
const reviewsPosB = ref(0)
let reviewsRafId = 0
const REVIEWS_MARQUEE_SPEED = 0.5
const REVIEWS_MARQUEE_START_B = 250

function reviewsMarqueeTick(): void {
  const halfA = reviewsTrackARef.value ? reviewsTrackARef.value.scrollWidth / 2 : 0
  const halfB = reviewsTrackBRef.value ? reviewsTrackBRef.value.scrollWidth / 2 : 0
  if (halfA > 0) {
    let p = reviewsPosA.value + REVIEWS_MARQUEE_SPEED
    if (p >= halfA) p -= halfA
    reviewsPosA.value = p
  }
  if (halfB > 0) {
    let p = reviewsPosB.value + REVIEWS_MARQUEE_SPEED
    if (p >= halfB) p -= halfB
    reviewsPosB.value = p
  }
  reviewsRafId = requestAnimationFrame(reviewsMarqueeTick)
}

onMounted(async () => {
  await nextTick()
  const halfB = reviewsTrackBRef.value ? reviewsTrackBRef.value.scrollWidth / 2 : 0
  reviewsPosB.value = halfB > 0 ? REVIEWS_MARQUEE_START_B % halfB : 0
  reviewsRafId = requestAnimationFrame(reviewsMarqueeTick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(reviewsRafId)
})
</script>
