<template>
  <div
    class="overflow-hidden rounded-[20px] bg-white font-dmSans shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]"
  >
    <p v-if="loading" class="px-8 py-12 text-center text-base text-black/50">{{ S.loading }}</p>
    <template v-else-if="detail">
      <div
        class="relative overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)] px-8 py-7 text-white max-[480px]:px-6"
      >
        <div
          class="pointer-events-none absolute -right-12 -top-16 size-[200px] rounded-full bg-white/[0.08]"
          aria-hidden="true"
        />
        <p class="relative m-0 text-[12px] font-bold uppercase tracking-[0.1em] text-white/75">
          {{ S.profilePublicReviewsTitle }}
        </p>
        <div class="relative mt-3 flex flex-wrap items-end gap-5">
          <p class="m-0 text-[52px] font-extrabold leading-none tracking-tight">
            {{ ratingAverageSk }}
          </p>
          <div class="flex flex-col gap-1.5 pb-1">
            <div class="flex gap-0.5" aria-hidden="true">
              <span
                v-for="i in 5"
                :key="`hdr-star-${i}`"
                class="text-[20px] leading-none"
                :class="i <= filledStars ? 'text-white' : 'text-white/30'"
              >★</span>
            </div>
            <p class="m-0 text-[15px] font-medium text-white/85">
              {{ reviewsSummaryLabel }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 px-8 py-7 max-[480px]:px-6">
        <div
          v-if="!reviews.length && !reviewsLoading"
          class="flex flex-col items-center rounded-2xl bg-marketing-surface px-6 py-12 text-center"
        >
          <div
            class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-marketing-panel"
          >
            <AppIcon name="star" :size="28" class="text-marketing-green/50" />
          </div>
          <p class="m-0 text-[17px] font-bold text-black/70">{{ S.profileNoReviews }}</p>
          <p class="m-0 mt-2 max-w-md text-[15px] leading-relaxed text-black/45">
            {{ S.profileReviewsEmptyHint }}
          </p>
        </div>

        <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
          <ProfileReviewListItem
            v-for="r in reviews"
            :key="r.id"
            :review="r"
            :date-label="formatReviewDate(r.created_at)"
            variant="panel"
          />
        </ul>

        <p v-if="reviewsLoading && reviews.length === 0" class="text-center text-sm text-black/50">
          {{ S.loading }}
        </p>

        <div v-if="reviewsHasMore" class="flex justify-center pt-1">
          <AppButton
            type="button"
            variant="outline"
            size="md"
            class="min-w-[200px] border-marketing-green text-marketing-green hover:bg-marketing-green hover:text-white"
            :disabled="reviewsLoading"
            @click="loadMoreReviews"
          >
            {{ reviewsLoading ? S.loading : S.profileLoadMoreReviews }}
          </AppButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { ProfileDetailPayload, ProfileReviewRow } from '~/components/profile/PublicProfileCard.vue'

const props = defineProps<{
  profileId: string
}>()

const REVIEW_PAGE = 15

function formatReviewDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

const { api } = useApi()

const loading = ref(true)
const detail = ref<ProfileDetailPayload | null>(null)
const reviews = ref<ProfileReviewRow[]>([])
const reviewsLoading = ref(false)
const reviewsHasMore = ref(true)

const ratingAverageSk = computed(() => {
  const n = Number(detail.value?.profile.rating_average ?? 0)
  return n.toLocaleString('sk-SK', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })
})

const filledStars = computed(() => {
  const n = Number(detail.value?.profile.rating_average ?? 0)
  return Math.min(5, Math.max(0, Math.round(n)))
})

const reviewsSummaryLabel = computed(() => {
  const count = detail.value?.profile.rating_count ?? 0
  return S.profilePublicRatingAverageFrom.replace('{n}', String(count))
})

async function loadDetail(): Promise<void> {
  const res = await api<ProfileDetailPayload>(`/api/profiles/${props.profileId}`)
  detail.value = res.ok && res.data?.profile ? res.data : null
}

async function fetchReviews(append: boolean): Promise<void> {
  reviewsLoading.value = true
  const offset = append ? reviews.value.length : 0
  try {
    const res = await api<ProfileReviewRow[]>(`/api/profiles/${props.profileId}/reviews`, {
      query: { limit: String(REVIEW_PAGE), offset: String(offset) },
    })
    if (res.ok && Array.isArray(res.data)) {
      reviews.value = append ? [...reviews.value, ...res.data] : res.data
      reviewsHasMore.value = res.data.length >= REVIEW_PAGE
    }
  } finally {
    reviewsLoading.value = false
  }
}

async function loadMoreReviews(): Promise<void> {
  await fetchReviews(true)
}

watch(
  () => props.profileId,
  async () => {
    loading.value = true
    reviews.value = []
    reviewsHasMore.value = true
    await loadDetail()
    if (detail.value) {
      await fetchReviews(false)
    }
    loading.value = false
  },
  { immediate: true },
)
</script>
