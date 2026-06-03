<template>
  <div
    :class="
      embedded
        ? 'w-full font-dmSans text-black/90'
        : 'box-border w-full px-5 pb-16 pt-6 font-dmSans text-black/90'
    "
  >
    <p v-if="loading" class="text-black/50">{{ S.loading }}</p>
    <template v-else-if="detail">
      <div class="mx-auto max-w-[1200px]">
        <div
          v-if="!reviewsOnly"
          class="mb-5 flex flex-wrap items-center justify-between gap-2 marketing:mb-5"
        >
          <AppBackLink
            v-if="!embedded"
            :to="backTo"
            :label="S.navBack"
            size="comfort"
          />
          <span v-else class="text-base font-extrabold text-black">{{ S.profilTitle }}</span>
        </div>

        <div
          class="flex flex-col gap-8 marketing:flex-row marketing:items-start"
        >
          <!-- Main column -->
          <div class="flex min-w-0 flex-1 flex-col gap-5">
            <!-- Hero -->
            <div
              v-if="!reviewsOnly"
              class="overflow-hidden rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]"
            >
              <div
                class="relative h-40 overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)]"
              >
                <div
                  class="pointer-events-none absolute -right-[60px] -top-20 size-[280px] rounded-full bg-white/[0.08]"
                  aria-hidden="true"
                />
                <div
                  class="pointer-events-none absolute bottom-[-40px] left-[60px] size-[140px] rounded-full bg-white/[0.06]"
                  aria-hidden="true"
                />
              </div>
              <div class="relative z-[3] px-8 pb-7 pt-0 max-[900px]:px-6">
                <div class="-mt-11 mb-4 flex items-end justify-between">
                  <div
                    class="flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-violet-600 text-[30px] font-bold text-white shadow-[0px_3px_10px_rgba(0,0,0,0.15)]"
                  >
                    <NuxtImg
                      v-if="avatarSrc"
                      :src="avatarSrc"
                      alt=""
                      width="88"
                      height="88"
                      loading="lazy"
                      decoding="async"
                      format="webp"
                      quality="85"
                      class="size-full object-cover"
                    />
                    <span v-else>{{ heroInitials }}</span>
                  </div>
                </div>
                <div class="mb-2 flex flex-wrap items-center gap-2.5">
                  <h1 class="m-0 text-[28px] font-extrabold leading-tight text-black">
                    {{ displayName }}
                  </h1>
                  <span
                    v-if="detail.profile.role === 'company' && detail.profile.registry_verified"
                    class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-marketing-panel px-3 py-1 text-sm font-bold text-marketing-green"
                    :title="S.badgeRegistryVerifiedTitle"
                  >
                    <AppIcon name="check-circle" :size="14" class="shrink-0" />
                    {{ S.badgeRegistryVerified }}
                  </span>
                  <span
                    v-if="detail.profile.role === 'company'"
                    class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700"
                  >
                    {{ S.profilePublicBadgeCompany }}
                  </span>
                </div>
                <div class="mb-3.5 flex flex-wrap items-center gap-[18px]">
                  <div class="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-black/50">
                    <span
                      v-for="i in 5"
                      :key="`hstar-${i}`"
                      class="text-[15px] leading-none"
                      :class="i <= heroFilledStars ? 'text-marketing-green' : 'text-black/15'"
                      aria-hidden="true"
                    >★</span>
                    <span class="ml-1">{{ ratingHeroLabel }}</span>
                  </div>
                  <div
                    v-if="detail.profile.location"
                    class="flex items-center gap-1.5 text-base font-medium text-black/50"
                  >
                    <AppIcon name="map-pin" :size="14" class="shrink-0 text-marketing-green" />
                    {{ detail.profile.location }}
                  </div>
                  <div class="flex items-center gap-1.5 text-base font-medium text-black/50">
                    <AppIcon name="calendar" :size="14" class="shrink-0 text-marketing-green" />
                    {{ memberSinceLong }}
                  </div>
                </div>
                <p
                  v-if="detail.profile.bio"
                  class="mb-4 text-[17px] font-normal leading-[1.7] text-black/70"
                >{{ detail.profile.bio }}</p>
                <div v-if="skillPills.length" class="mb-3 flex flex-wrap gap-2">
                  <span
                    v-for="(s, idx) in skillPills"
                    :key="`sk-${idx}-${s}`"
                    class="inline-flex items-center gap-1.5 rounded-full bg-marketing-surface px-3.5 py-1.5 text-[15px] font-medium text-black/65"
                  >{{ s }}</span>
                </div>
                <div v-if="rolePills.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="(rp, idx) in rolePills"
                    :key="`rp-${idx}-${rp.label}`"
                    class="inline-flex items-center gap-1.5 rounded-full bg-marketing-panel px-3.5 py-1.5 text-[15px] font-semibold text-marketing-green"
                  >
                    <AppIcon :name="rp.icon" :size="12" class="shrink-0 text-marketing-green" />
                    {{ rp.label }}
                  </span>
                </div>
              </div>
            </div>

            <!-- O mne -->
            <section
              v-if="!reviewsOnly && aboutParagraphs.length"
              class="rounded-[20px] bg-white px-8 py-7 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-[900px]:px-6 max-[900px]:py-6"
            >
              <h2 class="m-0 mb-5 text-xl font-extrabold text-black">{{ S.profilePublicAboutTitle }}</h2>
              <div class="text-[17px] font-normal leading-[1.75] text-black/[0.72]">
                <p v-for="(para, i) in aboutParagraphs" :key="`ab-${i}`" class="m-0 mb-3.5 last:mb-0">
                  {{ para }}
                </p>
              </div>
            </section>

            <!-- Aktívne ponuky -->
            <section
              v-if="!reviewsOnly"
              class="rounded-[20px] bg-white px-8 py-7 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-[900px]:px-6 max-[900px]:py-6"
            >
              <h2 class="m-0 mb-5 text-xl font-extrabold text-black">{{ S.aktivnePonuky }}</h2>
              <p v-if="publicJobsLoading && publicJobs.length === 0" class="text-base text-black/50">{{ S.loading }}</p>
              <div
                v-else-if="publicJobs.length === 0"
                class="py-8 text-center text-black/25"
              >
                <AppIcon name="briefcase" :size="36" class="mx-auto mb-2.5 text-black/20" />
                <p class="m-0 text-base">{{ S.profilePublicEmptyJobs }}</p>
              </div>
              <div v-else class="flex flex-col gap-3">
                <NuxtLink
                  v-for="job in publicJobs"
                  :key="job.id"
                  :to="ROUTES.jobDetail(job.id)"
                  class="flex items-center gap-4 rounded-[14px] bg-marketing-surface px-4 py-3.5 no-underline transition-colors hover:bg-marketing-mint"
                >
                  <div
                    class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-marketing-panel"
                  >
                    <CategoryIcon :category="job.category" :size="20" icon-class="text-marketing-green" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="mb-1 truncate text-base font-bold text-black">{{ job.title }}</div>
                    <div class="flex flex-wrap gap-3">
                      <span class="inline-flex items-center gap-1 text-[13px] font-medium text-black/45">
                        <AppIcon name="map-pin" :size="11" class="shrink-0 text-marketing-green" />
                        {{ getJobCardCityDisplay(job) }}
                      </span>
                      <span class="inline-flex items-center gap-1 text-[13px] font-medium text-black/45">
                        <AppIcon name="calendar" :size="11" class="shrink-0 text-marketing-green" />
                        {{ jobListDateLabel(job) }}
                      </span>
                    </div>
                  </div>
                  <span class="shrink-0 whitespace-nowrap text-[15px] font-bold text-marketing-green">
                    {{ getJobCardPayDisplay(job) }}
                  </span>
                </NuxtLink>
              </div>
            </section>

            <!-- Recenzie -->
            <section
              class="rounded-[20px] bg-white px-8 py-7 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-[900px]:px-6 max-[900px]:py-6"
            >
              <h2 class="m-0 mb-5 text-xl font-extrabold text-black">{{ S.profilePublicReviewsTitle }}</h2>
              <ProfileReviewForm
                v-if="showReviewForm"
                :profile-id="profileId"
                :is-owner="isOwner"
                :editing-review="editingReviewActive ? (detail.viewer_review ?? null) : null"
                @saved="onReviewFormSaved"
                @cancel="editingReviewActive = false"
                @conflict="onReviewConflict"
              />
              <div
                v-if="(detail.profile.rating_count ?? 0) > 0"
                class="mb-[18px] flex items-center gap-5 border-b border-black/[0.07] pb-[18px]"
              >
                <span class="text-[52px] font-extrabold leading-none text-marketing-green">
                  {{ ratingAverageSk }}
                </span>
                <div class="flex flex-col gap-1">
                  <div class="flex gap-0.5">
                    <span
                      v-for="i in 5"
                      :key="`rbs-${i}`"
                      class="text-lg leading-none"
                      :class="i <= heroFilledStars ? 'text-marketing-green' : 'text-black/15'"
                      aria-hidden="true"
                    >★</span>
                  </div>
                  <span class="text-[15px] text-black/40">{{ reviewsAverageLabel }}</span>
                </div>
              </div>
              <p v-if="!reviews.length && !reviewsLoading" class="text-base text-black/50">{{ S.profileNoReviews }}</p>
              <div v-else class="flex flex-col">
                <ProfileReviewListItem
                  v-for="r in reviews"
                  :key="r.id"
                  :review="r"
                  :date-label="formatReviewMonthYear(r.created_at)"
                  variant="public"
                  :show-actions="isOwnReviewRow(r)"
                  @edit="startEditOwnReview"
                  @delete="deleteOwnReview"
                />
              </div>
              <button
                v-if="reviewsHasMore"
                type="button"
                class="mt-3 border-none bg-transparent p-0 text-sm font-semibold text-marketing-green hover:underline"
                :disabled="reviewsLoading"
                @click="loadMoreReviews"
              >
                {{ reviewsLoading ? S.loading : S.profileLoadMoreReviews }}
              </button>
            </section>

          </div>

          <!-- Sidebar -->
          <aside
            v-if="!reviewsOnly"
            class="flex w-full shrink-0 flex-col gap-4 marketing:sticky marketing:top-[calc(0.625rem+3.5rem+max(0.25rem,env(safe-area-inset-top,0px))+0.75rem)] marketing:order-none marketing:w-[320px] marketing:min-w-[320px] max-[900px]:order-first"
          >
            <div
              class="flex flex-col gap-3 rounded-[20px] bg-white p-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]"
            >
              <button
                v-if="!isOwner"
                type="button"
                class="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border-none bg-marketing-green text-[17px] font-bold text-white transition-opacity hover:opacity-[0.88] disabled:cursor-wait disabled:opacity-70"
                :disabled="chatLoading"
                @click="onMessageClick"
              >
                <AppIcon name="chat" :size="18" class="shrink-0 text-white" />
                {{ chatLoading ? S.loading : S.profilePublicCtaMessage }}
              </button>
              <div
                v-if="chatPickerApps.length"
                class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
              >
                <p class="m-0 mb-2 text-sm font-semibold text-amber-950">
                  {{ S.profilePublicChatPickApplication }}
                </p>
                <div class="flex flex-col gap-2">
                  <button
                    v-for="a in chatPickerApps"
                    :key="a.id"
                    type="button"
                    class="rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm font-medium text-black hover:bg-amber-100/80"
                    :disabled="chatLoading"
                    @click="selectApplicationAndOpenChat(a.id)"
                  >
                    {{ a.job_title || 'Ponuka' }}
                    <span class="text-black/45">({{ a.status }})</span>
                  </button>
                </div>
              </div>
              <p v-if="chatError" class="m-0 text-center text-sm text-red-600">{{ chatError }}</p>
              <hr class="m-0 border-0 border-t border-black/[0.07]">
              <button
                type="button"
                disabled
                class="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-marketing-surface text-[15px] font-bold text-black/60 opacity-70"
                :title="S.profilePublicSaveSoon"
              >
                <AppIcon name="bookmark" :size="16" class="shrink-0" />
                {{ S.profilePublicCtaSave }}
              </button>
              <button
                type="button"
                class="flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-marketing-surface text-[15px] font-bold text-black/60 transition-colors hover:border-marketing-green hover:text-marketing-green"
                @click="shareProfile"
              >
                <AppIcon name="share-2" :size="16" class="shrink-0" />
                {{ S.profilePublicCtaShare }}
              </button>
              <p v-if="shareFeedback" class="m-0 text-center text-xs text-marketing-green">{{ shareFeedback }}</p>
            </div>

            <div
              class="rounded-[20px] bg-white px-7 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-[900px]:px-6"
            >
              <h3 class="m-0 mb-4 text-lg font-extrabold text-black">{{ S.profilePublicStatsTitle }}</h3>
              <div class="flex flex-col">
                <div class="flex items-center justify-between border-b border-black/[0.06] py-3.5 first:pt-0 last:border-b-0 last:pb-0">
                  <span class="flex items-center gap-2 text-base font-medium text-black/50">
                    <AppIcon name="star" :size="16" class="w-4 shrink-0 text-center text-marketing-green" />
                    {{ S.profilePublicStatsRating }}
                  </span>
                  <span class="text-base font-bold text-black">{{ ratingAverageSk }} ★</span>
                </div>
                <div class="flex items-center justify-between border-b border-black/[0.06] py-3.5 last:border-b-0">
                  <span class="flex items-center gap-2 text-base font-medium text-black/50">
                    <AppIcon name="chat" :size="16" class="w-4 shrink-0 text-center text-marketing-green" />
                    {{ S.profilePublicStatsReviews }}
                  </span>
                  <span class="text-base font-bold text-black">{{ detail.profile.rating_count }}</span>
                </div>
                <div class="flex items-center justify-between border-b border-black/[0.06] py-3.5 last:border-b-0">
                  <span class="flex items-center gap-2 text-base font-medium text-black/50">
                    <AppIcon name="briefcase" :size="16" class="w-4 shrink-0 text-center text-marketing-green" />
                    {{ S.profilePublicStatsActiveOffers }}
                  </span>
                  <span class="text-base font-bold text-black">{{ publicJobs.length }}</span>
                </div>
                <div class="flex items-center justify-between border-b border-black/[0.06] py-3.5 last:border-b-0">
                  <span class="flex items-center gap-2 text-base font-medium text-black/50">
                    <AppIcon name="calendar" :size="16" class="w-4 shrink-0 text-center text-marketing-green" />
                    {{ S.profilePublicStatsMemberSince }}
                  </span>
                  <span class="text-base font-bold text-black">{{ memberSinceShort }}</span>
                </div>
                <div class="flex items-center justify-between pt-3.5">
                  <span class="flex items-center gap-2 text-base font-medium text-black/50">
                    <AppIcon name="check-circle" :size="16" class="w-4 shrink-0 text-center text-marketing-green" />
                    {{ S.profilePublicStatsVerified }}
                  </span>
                  <span
                    class="text-base font-bold"
                    :class="isRegistryVerified ? 'text-marketing-green' : 'text-black'"
                  >{{ isRegistryVerified ? S.profilePublicVerifiedYes : S.profilePublicVerifiedNo }}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { showNotFound } from '~/utils/not-found'
import { type AppIconName } from '~/utils/app-icons'
import { type Job, employerInitials, getJobCardCityDisplay, getJobCardPayDisplay } from '~/utils/job'

export type ProfileSubscription = {
  plan_id: string
  plan_name_sk: string
  status: string
  current_period_end: string | null
}

export type PublicProfilePayload = {
  id: string
  role: string
  display_name: string | null
  company_name: string | null
  avatar_url: string | null
  logo_url: string | null
  bio: string | null
  description: string | null
  location: string | null
  skills: string | null
  sector: string | null
  website: string | null
  registered_office: string | null
  phone_e164: string | null
  /** Present when owner opted in (resolved server-side). */
  contact_email: string | null
  customer_role: boolean
  worker_role: boolean
  provider_role: boolean
  created_at: string
  rating_average: number
  rating_count: number
  registry_verified?: boolean
}

export type ProfileDetailPayload = {
  profile: PublicProfilePayload
  owner?: { credits: number; subscription: ProfileSubscription | null }
  viewer_review?: ProfileReviewRow | null
}

export type ProfileReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_id: string
  reviewer_display_name: string | null
  reviewer_role?: string | null
  reviewer_avatar_url?: string | null
  reviewer_logo_url?: string | null
  reviewer_public_profile_enabled?: boolean
}

const props = withDefaults(
  defineProps<{
    profileId: string
    /** SSR payload from the profile page — skips the duplicate GET on first paint. */
    initialDetail?: ProfileDetailPayload | null
    embedded?: boolean
    reviewsOnly?: boolean
    backTo?: string
  }>(),
  { initialDetail: null, embedded: false, reviewsOnly: false, backTo: ROUTES.find }
)

const { user, session } = useAuth()
const { api } = useApi()
const { confirm } = useConfirm()
const { postOpenChat, navigateToChatRoom } = useProfileOpenChat()

const loading = ref(true)
const detail = ref<ProfileDetailPayload | null>(null)
const reviews = ref<ProfileReviewRow[]>([])
const reviewsLoading = ref(false)
const reviewsHasMore = ref(true)
const REVIEW_PAGE = 15
const publicJobs = ref<Job[]>([])
const publicJobsLoading = ref(false)
const shareFeedback = ref('')
const chatLoading = ref(false)
const chatError = ref<string | null>(null)
const chatPickerApps = ref<Array<{ id: string; job_title: string | null; status: string }>>([])

const isOwner = computed(() => Boolean(user.value?.id && user.value.id === props.profileId))

const editingReviewActive = ref(false)

const hasOwnReview = computed(() => Boolean(detail.value?.viewer_review?.id))

const showReviewForm = computed(() => {
  if (props.reviewsOnly || isOwner.value) return false
  if (!hasOwnReview.value) return true
  return editingReviewActive.value
})

const loginChatHref = computed(
  () =>
    `/auth/login?redirect=${encodeURIComponent(ROUTES.publicProfile(props.profileId))}`,
)

const displayName = computed(() => {
  const p = detail.value?.profile
  if (!p) return ''
  if (p.role === 'company') {
    return p.company_name?.trim() || p.display_name?.trim() || '—'
  }
  return p.display_name?.trim() || '—'
})

const heroInitials = computed(() => employerInitials(displayName.value))

const avatarSrc = computed(() => {
  const p = detail.value?.profile
  if (!p) return ''
  if (p.role === 'company') {
    return p.logo_url || p.avatar_url || ''
  }
  return p.avatar_url || p.logo_url || ''
})

const ratingAverageSk = computed(() => {
  const n = Number(detail.value?.profile.rating_average ?? 0)
  return n.toLocaleString('sk-SK', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })
})

const heroFilledStars = computed(() => {
  const n = Number(detail.value?.profile.rating_average ?? 0)
  return Math.min(5, Math.max(0, Math.round(n)))
})

const ratingHeroLabel = computed(() => {
  const p = detail.value?.profile
  if (!p) return ''
  const count = p.rating_count
  const r = ratingAverageSk.value
  return `${r} (${count} ${S.profileRatingCount})`
})

const reviewsAverageLabel = computed(() => {
  const n = detail.value?.profile.rating_count ?? 0
  return S.profilePublicRatingAverageFrom.replace('{n}', String(n))
})

const memberSinceLong = computed(() => {
  const iso = detail.value?.profile.created_at
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const inner = d.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
    return `${S.profilePublicMemberSinceShort} ${inner}`
  } catch {
    return ''
  }
})

const memberSinceShort = computed(() => {
  const iso = detail.value?.profile.created_at
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('sk-SK', { month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
})

const isRegistryVerified = computed(
  () =>
    detail.value?.profile.role === 'company' && Boolean(detail.value.profile.registry_verified)
)

const aboutParagraphs = computed((): string[] => {
  const t = detail.value?.profile.description?.trim()
  if (!t) return []
  return t
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
})

const skillPills = computed((): string[] => {
  const raw = detail.value?.profile.skills?.trim()
  if (!raw) return []
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
})

const rolePills = computed((): { label: string; icon: AppIconName }[] => {
  const p = detail.value?.profile
  if (!p) return []
  const items: { label: string; icon: AppIconName }[] = []
  if (p.customer_role) {
    items.push({ label: S.roleCustomerCard, icon: 'wrench' })
  }
  if (p.worker_role) {
    items.push({ label: S.roleWorkerCard, icon: 'briefcase' })
  }
  if (p.provider_role) {
    items.push({ label: S.roleProviderCard, icon: 'building' })
  }
  return items
})

function formatReviewMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function jobDeadlineShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function jobListDateLabel(job: Job): string {
  const a = jobDeadlineShort(job.application_deadline)
  const c = jobDeadlineShort(job.completion_deadline)
  if (a) return `${S.profilePublicJobFrom} ${a}`
  if (c) return `${S.profilePublicJobFrom} ${c}`
  if (job.compensation_type === 'on_request' || job.compensation_type === 'auction') {
    return S.profilePublicJobDateTbd
  }
  return S.profilePublicJobDateTbd
}

async function onMessageClick(): Promise<void> {
  if (!session.value?.access_token) {
    await navigateTo(loginChatHref.value)
    return
  }
  chatError.value = null
  chatPickerApps.value = []
  chatLoading.value = true
  const res = await postOpenChat(props.profileId)
  chatLoading.value = false
  if (!res.ok) {
    chatError.value = res.error ?? 'Chyba'
    return
  }
  if (!res.data) {
    chatError.value = 'Prázdna odpoveď'
    return
  }
  if ('room_id' in res.data) {
    await navigateToChatRoom(res.data.room_id)
    return
  }
  chatPickerApps.value = res.data.applications ?? []
}

async function selectApplicationAndOpenChat(applicationId: string): Promise<void> {
  chatError.value = null
  chatLoading.value = true
  const res = await postOpenChat(props.profileId, { application_id: applicationId })
  chatLoading.value = false
  if (!res.ok) {
    chatError.value = res.error ?? 'Chyba'
    return
  }
  if (res.data && 'room_id' in res.data) {
    chatPickerApps.value = []
    await navigateToChatRoom(res.data.room_id)
  }
}

function shareProfile(): void {
  if (!import.meta.client) return
  const url = window.location.href
  shareFeedback.value = ''
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    void navigator
      .share({ title: displayName.value, url })
      .catch(() => {
        void copyProfileUrl(url)
      })
    return
  }
  void copyProfileUrl(url)
}

async function copyProfileUrl(url: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      shareFeedback.value = S.profilePublicShareCopied
      window.setTimeout(() => {
        shareFeedback.value = ''
      }, 2500)
    }
  } catch {
    shareFeedback.value = ''
  }
}

async function loadDetail(): Promise<void> {
  const res = await api<ProfileDetailPayload>(`/api/profiles/${props.profileId}`)
  if (!res.ok || !res.data?.profile) {
    detail.value = null
    showNotFound(S.profileNotFound)
    return
  }
  detail.value = res.data
}

async function fetchReviews(append: boolean): Promise<void> {
  reviewsLoading.value = true
  const offset = append ? reviews.value.length : 0
  const res = await api<ProfileReviewRow[]>(`/api/profiles/${props.profileId}/reviews`, {
    query: { limit: String(REVIEW_PAGE), offset: String(offset) },
  })
  if (res.ok && Array.isArray(res.data)) {
    if (append) {
      reviews.value = [...reviews.value, ...res.data]
    } else {
      reviews.value = res.data
    }
    reviewsHasMore.value = res.data.length >= REVIEW_PAGE
  }
  reviewsLoading.value = false
}

async function loadMoreReviews(): Promise<void> {
  await fetchReviews(true)
}

async function onReviewSaved(): Promise<void> {
  await loadDetail()
  if (detail.value) {
    await fetchReviews(false)
  }
}

async function onReviewFormSaved(): Promise<void> {
  editingReviewActive.value = false
  await onReviewSaved()
}

async function onReviewConflict(): Promise<void> {
  editingReviewActive.value = false
  await loadDetail()
}

function isOwnReviewRow(r: ProfileReviewRow): boolean {
  return Boolean(user.value?.id && r.reviewer_id === user.value.id)
}

function startEditOwnReview(): void {
  editingReviewActive.value = true
}

async function deleteOwnReview(): Promise<void> {
  const ok = await confirm({
    title: S.firmyReviewDeleteTitle,
    message: S.firmyReviewDeleteConfirm,
    confirmDanger: true,
    confirmText: S.firmyReviewDeleteTitle,
  })
  if (!ok) return
  const res = await api<{ deleted: true }>(
    `/api/profiles/${props.profileId}/reviews`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    return
  }
  editingReviewActive.value = false
  await onReviewSaved()
}

async function fetchPublicJobs(): Promise<void> {
  publicJobsLoading.value = true
  const res = await api<Job[]>('/api/jobs', {
    query: {
      company_id: props.profileId,
      is_active: 'true',
      limit: '80',
    },
  })
  if (res.ok && Array.isArray(res.data)) {
    publicJobs.value = res.data.filter((j) => !j.is_draft && j.is_active)
  } else {
    publicJobs.value = []
  }
  publicJobsLoading.value = false
}

async function recordProfileViewIfVisitor(): Promise<void> {
  if (!import.meta.client) return
  if (!session.value?.access_token || !user.value?.id) return
  if (user.value.id === props.profileId) return
  await api('/api/analytics/profile-view', {
    method: 'POST',
    body: { viewedProfileId: props.profileId },
  })
}

function applyInitialDetailIfMatching(): boolean {
  const initial = props.initialDetail
  if (!initial?.profile || initial.profile.id !== props.profileId) {
    return false
  }
  detail.value = initial
  return true
}

watch(
  () => [props.profileId, props.initialDetail, user.value?.id] as const,
  async () => {
    loading.value = true
    editingReviewActive.value = false
    reviews.value = []
    reviewsHasMore.value = true
    publicJobs.value = []
    chatError.value = null
    chatPickerApps.value = []
    const hydrated = applyInitialDetailIfMatching()
    if (!hydrated) {
      await loadDetail()
    }
    if (detail.value) {
      await Promise.all([fetchReviews(false), fetchPublicJobs()])
      await recordProfileViewIfVisitor()
    }
    loading.value = false
  },
  { immediate: true }
)
</script>
