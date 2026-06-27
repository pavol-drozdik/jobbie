<template>
  <div class="app-shell">
    <div class="frame-surface min-w-0">
      <div class="mx-auto box-border w-full min-w-0 max-w-full overflow-visible px-3.5 pb-16 pt-[30px] marketing:pb-20 sm:px-5">
        <AppDetailPageSkeleton v-if="loading" />
        <template v-else-if="job">
          <div
            v-if="showInactiveListingBanner"
            class="mb-4 rounded-[14px] border border-amber-200/90 bg-amber-50 px-4 py-3 text-[15px] font-medium leading-snug text-amber-950"
            role="status"
          >
            {{ S.jobListingInactiveNotice }}
          </div>
          <!-- Mobile: plat (salary/apply) after title; similar offers last -->
          <div class="flex w-full min-w-0 flex-col gap-5 marketing:hidden">
            <div class="mb-1">
              <AppBackLink :to="ROUTES.find" :label="S.jobBackToOffers" />
            </div>
            <div class="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-[20px] bg-marketing-panel">
              <NuxtImg
                class="size-full min-h-0 min-w-0 max-w-full object-cover"
                :src="heroImageSrc"
                :alt="job?.title ?? ''"
                width="1200"
                height="900"
                fetchpriority="high"
                format="webp"
                quality="85"
              />
              <div class="absolute left-[18px] top-[18px] flex flex-wrap gap-2">
                <div
                  v-if="categoryLabel"
                  class="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-black backdrop-blur-sm"
                >
                  <CategoryIcon :category="job.category" :size="13" icon-class="shrink-0 text-marketing-green" />
                  {{ categoryLabel }}
                </div>
                <div
                  v-if="job.is_foreign"
                  class="rounded-full bg-marketing-green/90 px-3.5 py-1.5 text-sm font-bold text-white backdrop-blur-sm"
                >{{ S.jobDetailForeignBadge }}</div>
              </div>
              <div class="absolute right-[18px] top-[18px] z-10 flex items-start gap-2">
                <div
                  v-if="job.is_urgent"
                  class="inline-flex items-center gap-1.5 rounded-full bg-marketing-green px-3.5 py-1.5 text-sm font-bold text-white"
                >
                  <AppIcon name="bolt" :size="12" class="text-white" />
                  Urgentné
                </div>
                <div
                  v-else-if="isNewJob"
                  class="rounded-full bg-marketing-green px-3.5 py-1.5 text-sm font-bold text-white"
                >Nové</div>
              </div>
            </div>
            <div class="rounded-[20px] bg-white px-6 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9 marketing:py-8">
              <h1 class="m-0 mb-5 text-[26px] font-extrabold leading-snug text-black">{{ job.title }}</h1>
              <div class="flex flex-wrap gap-2.5">
                <div
                  v-for="(pill, idx) in metaPills"
                  :key="idx"
                  class="inline-flex items-center gap-1.5 rounded-full bg-marketing-soft px-4 py-2 text-[15px] font-medium text-black/70"
                >
                  <AppIcon :name="pill.icon" :size="14" class="shrink-0 text-marketing-green" />
                  {{ pill.text }}
                </div>
              </div>
            </div>
            <JobSingularSalaryApplyCard
              v-if="job"
              :job="job"
              :salary-kind-label="salaryKindLabel"
              :salary-amount-line="salaryAmountLine"
              :salary-subline="salarySubline"
              :application-deadline-formatted="applicationDeadlineFormatted"
              :is-owner="isOwner"
              :has-user="hasUser"
              :applied="applied"
              :action-loading="actionLoading"
              :save-loading="saveLoading"
              :is-saved="isSaved"
              :show-stats-toggle="showStats"
              :login-with-redirect="loginWithRedirect"
              @toggle-stats="toggleStats"
              @activate="handleActivate"
              @apply="handleApply"
              @save="toggleSave"
            />
            <div class="flex items-center gap-[18px] rounded-[20px] bg-white px-7 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
              <div
                class="flex size-[58px] min-h-[58px] min-w-[58px] shrink-0 items-center justify-center rounded-full bg-marketing-green text-xl font-bold text-white"
              >{{ employerInitials(job.employer_name) }}</div>
              <div class="min-w-0 flex-1">
                <div class="mb-0.5 text-[13px] font-medium text-black/40">{{ S.jobPostedBy }}</div>
                <div class="mb-1 text-[19px] font-bold text-black">{{ job.employer_name || S.employerDefault }}</div>
                <div class="text-sm font-semibold text-black/50">{{ S.jobNoRatingsYet }}</div>
              </div>
              <NuxtLink
                v-if="job.company_id"
                :to="ROUTES.publicProfile(job.company_id)"
                class="inline-flex shrink-0 is-clickable items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-5 py-2.5 text-[15px] font-semibold text-black no-underline transition-colors hover:border-marketing-green hover:text-marketing-green"
              >{{ S.jobViewProfile }}</NuxtLink>
              <span
                v-else
                class="inline-flex shrink-0 is-disabled-cursor items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-5 py-2.5 text-[15px] font-semibold text-black/35"
              >{{ S.jobViewProfile }}</span>
            </div>
            <div class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9">
              <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.jobDescription }}</h2>
              <div
                v-if="descUsesHtml"
                class="rich-html-content job-desc-html min-w-0 overflow-x-auto text-[17px] font-normal leading-[1.7] text-black/75"
                v-html="descriptionSanitized"
              />
              <div
                v-else
                class="min-w-0 whitespace-pre-wrap text-[17px] font-normal leading-[1.7] text-black/75"
              >{{ descriptionPlain }}</div>
            </div>
            <JobSingularDetailsSections v-if="job" :job="job" />
            <div
              v-if="galleryPhotos.length > 0"
              class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
            >
              <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.jobGalleryTitle }}</h2>
              <div class="flex flex-col gap-3">
                <div class="aspect-[4/3] w-full min-w-0 overflow-hidden rounded-[14px] bg-marketing-soft">
                  <NuxtImg
                    :key="gallerySelectedIndex"
                    :src="galleryPhotos[gallerySelectedIndex]"
                    alt=""
                    class="size-full min-h-0 min-w-0 max-w-full object-cover"
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                    format="webp"
                    quality="82"
                  />
                </div>
                <div class="flex min-w-0 gap-2.5">
                  <button
                    v-for="(url, i) in galleryPhotos"
                    :key="i"
                    type="button"
                    class="relative aspect-[4/3] w-20 shrink-0 is-clickable overflow-hidden rounded-[10px] border-[2.5px] border-transparent transition-all hover:opacity-85"
                    :class="i === gallerySelectedIndex ? 'border-marketing-green opacity-100' : 'opacity-60'"
                    :aria-label="`${S.jobGalleryTitle} ${i + 1}`"
                    @click="selectGalleryThumb(i)"
                  >
                    <NuxtImg
                      :src="url"
                      alt=""
                      class="size-full min-h-0 min-w-0 max-w-full object-cover"
                      width="80"
                      height="60"
                      loading="lazy"
                      decoding="async"
                      format="webp"
                      quality="75"
                    />
                  </button>
                </div>
              </div>
            </div>
            <JobSingularSimilarOffers :jobs="similarJobsTopThree" />
          </div>
          <!-- Desktop: main + sidebar (sidebar sticks while scrolling, like CV editor) -->
          <div
            ref="desktopShellRef"
            class="hidden w-full min-w-0 marketing:grid marketing:grid-cols-[minmax(0,1fr)_380px] marketing:items-start marketing:gap-x-9"
          >
            <div class="w-full min-w-0 space-y-5">
              <div class="mb-5">
                <AppBackLink :to="ROUTES.find" :label="S.jobBackToOffers" />
              </div>
              <div class="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-[20px] bg-marketing-panel">
                <NuxtImg
                  class="size-full min-h-0 min-w-0 max-w-full object-cover"
                  :src="heroImageSrc"
                  :alt="job?.title ?? ''"
                  width="1200"
                  height="900"
                  fetchpriority="high"
                  format="webp"
                  quality="85"
                />
                <div class="absolute left-[18px] top-[18px] flex flex-wrap gap-2">
                  <div
                    v-if="categoryLabel"
                    class="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-black backdrop-blur-sm"
                  >
                    <CategoryIcon :category="job.category" :size="13" icon-class="shrink-0 text-marketing-green" />
                    {{ categoryLabel }}
                  </div>
                  <div
                    v-if="job.is_foreign"
                    class="rounded-full bg-marketing-green/90 px-3.5 py-1.5 text-sm font-bold text-white backdrop-blur-sm"
                  >{{ S.jobDetailForeignBadge }}</div>
                </div>
                <div class="absolute right-[18px] top-[18px] z-10 flex items-start gap-2">
                  <div
                    v-if="job.is_urgent"
                    class="inline-flex items-center gap-1.5 rounded-full bg-marketing-green px-3.5 py-1.5 text-sm font-bold text-white"
                  >
                    <AppIcon name="bolt" :size="12" class="text-white" />
                    Urgentné
                  </div>
                  <div
                    v-else-if="isNewJob"
                    class="rounded-full bg-marketing-green px-3.5 py-1.5 text-sm font-bold text-white"
                  >Nové</div>
                </div>
              </div>
              <div class="rounded-[20px] bg-white px-6 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9 marketing:py-8">
                <h1 class="m-0 mb-5 text-[26px] font-extrabold leading-snug text-black marketing:text-4xl">{{ job.title }}</h1>
                <div class="flex flex-wrap gap-2.5">
                  <div
                    v-for="(pill, idx) in metaPills"
                    :key="idx"
                    class="inline-flex items-center gap-1.5 rounded-full bg-marketing-soft px-4 py-2 text-[15px] font-medium text-black/70"
                  >
                    <AppIcon :name="pill.icon" :size="14" class="shrink-0 text-marketing-green" />
                    {{ pill.text }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-[18px] rounded-[20px] bg-white px-7 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
                <div
                  class="flex size-[58px] min-h-[58px] min-w-[58px] shrink-0 items-center justify-center rounded-full bg-marketing-green text-xl font-bold text-white"
                >{{ employerInitials(job.employer_name) }}</div>
                <div class="min-w-0 flex-1">
                  <div class="mb-0.5 text-[13px] font-medium text-black/40">{{ S.jobPostedBy }}</div>
                  <div class="mb-1 text-[19px] font-bold text-black">{{ job.employer_name || S.employerDefault }}</div>
                  <div class="text-sm font-semibold text-black/50">{{ S.jobNoRatingsYet }}</div>
                </div>
                <NuxtLink
                  v-if="job.company_id"
                  :to="ROUTES.publicProfile(job.company_id)"
                  class="inline-flex shrink-0 is-clickable items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-5 py-2.5 text-[15px] font-semibold text-black no-underline transition-colors hover:border-marketing-green hover:text-marketing-green"
                >{{ S.jobViewProfile }}</NuxtLink>
                <span
                  v-else
                  class="inline-flex shrink-0 is-disabled-cursor items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-5 py-2.5 text-[15px] font-semibold text-black/35"
                >{{ S.jobViewProfile }}</span>
              </div>
              <div class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9">
                <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.jobDescription }}</h2>
                <div
                  v-if="descUsesHtml"
                  class="rich-html-content job-desc-html min-w-0 overflow-x-auto text-[17px] font-normal leading-[1.7] text-black/75"
                  v-html="descriptionSanitized"
                />
                <div
                  v-else
                  class="min-w-0 whitespace-pre-wrap text-[17px] font-normal leading-[1.7] text-black/75"
                >{{ descriptionPlain }}</div>
              </div>
              <JobSingularDetailsSections v-if="job" :job="job" />
              <div
                v-if="galleryPhotos.length > 0"
                class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
              >
                <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.jobGalleryTitle }}</h2>
                <div class="flex flex-col gap-3">
                  <div class="aspect-[4/3] w-full min-w-0 overflow-hidden rounded-[14px] bg-marketing-soft">
                    <NuxtImg
                      :key="gallerySelectedIndex"
                      :src="galleryPhotos[gallerySelectedIndex]"
                      alt=""
                      class="size-full min-h-0 min-w-0 max-w-full object-cover"
                      width="800"
                      height="600"
                      loading="lazy"
                      decoding="async"
                      format="webp"
                      quality="82"
                    />
                  </div>
                  <div class="flex min-w-0 gap-2.5">
                    <button
                      v-for="(url, i) in galleryPhotos"
                      :key="i"
                      type="button"
                      class="relative aspect-[4/3] w-20 shrink-0 is-clickable overflow-hidden rounded-[10px] border-[2.5px] border-transparent transition-all hover:opacity-85"
                      :class="i === gallerySelectedIndex ? 'border-marketing-green opacity-100' : 'opacity-60'"
                      :aria-label="`${S.jobGalleryTitle} ${i + 1}`"
                      @click="selectGalleryThumb(i)"
                    >
                      <NuxtImg
                      :src="url"
                      alt=""
                      class="size-full min-h-0 min-w-0 max-w-full object-cover"
                      width="80"
                      height="60"
                      loading="lazy"
                      decoding="async"
                      format="webp"
                      quality="75"
                    />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <aside ref="desktopAsideRef" class="relative w-full min-w-0">
              <div class="flex w-full min-w-0 flex-col gap-5 marketing:mt-[40px]">
              <JobSingularSalaryApplyCard
                v-if="job"
                :job="job"
                :salary-kind-label="salaryKindLabel"
                :salary-amount-line="salaryAmountLine"
                :salary-subline="salarySubline"
                :application-deadline-formatted="applicationDeadlineFormatted"
                :is-owner="isOwner"
                :has-user="hasUser"
                :applied="applied"
                :action-loading="actionLoading"
                :save-loading="saveLoading"
                :is-saved="isSaved"
                :show-stats-toggle="showStats"
                :login-with-redirect="loginWithRedirect"
                @toggle-stats="toggleStats"
                @activate="handleActivate"
                @apply="handleApply"
                @save="toggleSave"
              />
              <JobSingularSimilarOffers :jobs="similarJobsTopThree" />
              </div>
            </aside>
          </div>
          <section v-if="isOwner && showStats && job" ref="statsSectionEl" class="mt-8">
            <JobStatsPanel :job-id="job.id" />
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { showNotFound } from '~/utils/not-found'
import {
  COMPENSATION_TYPES,
  employerInitials,
  formatCompensationAmountSk,
  getCategoryLabel,
  getJobCardPayDisplay,
  getJobCardThumbnailSrc,
  getJobCardWorkModeLabel,
  getJobPublicLocation,
  getJobTypeLabel,
  JOB_CARD_PLACEHOLDER_PATH,
} from '~/utils/job'
import type { Job } from '~/utils/job'
import {
  employmentTypePills,
  firstScheduleMetaPill,
} from '~/utils/job-detail-display'
import { getSalaryTypeLabel } from '~/utils/job-post-options'
import { type AppIconName } from '~/utils/app-icons'
import {
  jobDescriptionLooksLikeHtml,
  sanitizeJobDescriptionForDisplay,
} from '~/utils/sanitize-job-description-html'
import { fetchPublicJob } from '~/composables/usePublicJob'
import { useJobDetailSeo } from '~/composables/usePublicContentSeo'

definePageMeta({ layout: 'app' })

const route = useRoute()
const id = computed(() => route.params.id as string)
const { api } = useApi()
const { user, session } = useAuth()
const { capture } = useAnalytics()

const loginWithRedirect = computed(() => ({
  path: '/auth/login',
  query: { redirect: route.fullPath },
}))

const { data: initialJob, pending: jobPending, refresh: refreshJob } = await useAsyncData(
  () => `public-job-${id.value}`,
  () => fetchPublicJob(id.value),
  { watch: [id] },
)

if (import.meta.server && id.value && !initialJob.value) {
  throw createError({ statusCode: 404, statusMessage: 'Job not found' })
}

const job = ref<Job | null>(initialJob.value)
const similarJobs = ref<Job[]>([])
const loading = computed(() => jobPending.value && !job.value)
const actionLoading = ref(false)
const applied = ref(false)
const showStats = ref(false)
const statsSectionEl = ref<HTMLElement | null>(null)
const desktopShellRef = ref<HTMLElement | null>(null)
const desktopAsideRef = ref<HTMLElement | null>(null)
useCvPrototypeStickySidebar(desktopAsideRef, desktopShellRef, {
  mobileBreakpoint: 900,
  offset: 100,
})
const isSaved = ref(false)
const saveLoading = ref(false)
const gallerySelectedIndex = ref(0)

const similarJobsTopThree = computed(() => similarJobs.value.slice(0, 3))

function selectGalleryThumb(i: number): void {
  gallerySelectedIndex.value = i
}

async function toggleStats(): Promise<void> {
  showStats.value = !showStats.value
  if (!showStats.value) return
  await nextTick()
  statsSectionEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatDescriptionPlain(html: string): string {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const photos = computed(() => {
  const p = job.value?.photos
  return Array.isArray(p) ? (p.filter((x): x is string => typeof x === 'string') as string[]) : []
})

const galleryPhotos = computed(() => {
  const p = photos.value
  if (p.length <= 1) return []
  return p.slice(1)
})

watch(
  galleryPhotos,
  () => {
    gallerySelectedIndex.value = 0
  },
  { deep: true },
)

const heroImageSrc = computed(() =>
  job.value ? getJobCardThumbnailSrc(job.value) : JOB_CARD_PLACEHOLDER_PATH,
)

const categoryLabel = computed(() => {
  const c = job.value?.category
  if (!c) return ''
  return getCategoryLabel(c)
})

const isNewJob = computed(() => {
  const c = job.value?.created_at
  if (!c) return false
  const created = new Date(c).getTime()
  if (Number.isNaN(created)) return false
  const days = (Date.now() - created) / (1000 * 60 * 60 * 24)
  return days <= 7
})

const metaPills = computed((): { icon: AppIconName; text: string }[] => {
  const j = job.value
  if (!j) return []
  const pills: { icon: AppIconName; text: string }[] = []
  const loc = getJobPublicLocation(j).trim()
  if (loc && loc !== '—') pills.push({ icon: 'map-pin', text: loc })
  const wm = getJobCardWorkModeLabel(j)
  if (wm) pills.push({ icon: 'briefcase', text: wm })
  const empLabels = employmentTypePills(j)
  if (empLabels.length > 0) {
    for (const label of empLabels) {
      pills.push({ icon: 'briefcase', text: label })
    }
  } else {
    const jt = getJobTypeLabel(j.job_type)
    if (jt) pills.push({ icon: 'briefcase', text: jt })
  }
  const schedule = firstScheduleMetaPill(j)
  if (schedule) pills.push({ icon: 'calendar', text: schedule })
  const ct = (j.contract_type || '').trim()
  if (ct) pills.push({ icon: 'clock', text: ct })
  return pills
})

const rawDescription = computed(() => job.value?.description || '')

const descUsesHtml = computed(() => jobDescriptionLooksLikeHtml(rawDescription.value))

const descriptionSanitized = computed(() => sanitizeJobDescriptionForDisplay(rawDescription.value))

const descriptionPlain = computed(() => formatDescriptionPlain(rawDescription.value))

const isOwner = computed(() => !!user.value && !!job.value && job.value.company_id === user.value!.id)

const hasUser = computed(() => !!user.value)

const showInactiveListingBanner = computed(
  () =>
    Boolean(
      job.value &&
        hasUser.value &&
        job.value.is_active === false &&
        job.value.is_draft !== true,
    ),
)

const salaryKindLabel = computed(() => {
  const j = job.value
  if (!j) return ''
  if (j.salary_negotiable || j.salary_type === 'negotiable') {
    return getSalaryTypeLabel('negotiable', S.jobSalary)
  }
  const st = (j.salary_type ?? '').trim()
  if (st) return getSalaryTypeLabel(st, S.jobSalary)
  if (j.compensation_type === 'hourly') return getSalaryTypeLabel('hourly', S.jobSalary)
  const row = COMPENSATION_TYPES.find((x) => x.value === j.compensation_type)
  if (row?.value === 'on_request') return getSalaryTypeLabel('negotiable', S.jobSalary)
  return row?.label ?? S.jobSalary
})

const salaryAmountLine = computed(() => {
  const j = job.value
  if (!j) return '—'
  return getJobCardPayDisplay(j)
})

const salarySubline = computed(() => {
  const j = job.value
  if (!j) return ''
  if (j.salary_type === 'one_time') return 'za celú prácu'
  if (j.salary_type === 'task_based') return 'za úlohu'
  if (j.compensation_type === 'fixed' && j.compensation_amount != null) return 'za celú prácu'
  return ''
})

const applicationDeadlineFormatted = computed(() => {
  const d = job.value?.application_deadline
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
})

useJobDetailSeo(job, {
  fallbackTitle: S.jobOffers,
})

watch(initialJob, (value) => {
  if (value) {
    job.value = value
  }
})

async function refreshSavedState(): Promise<void> {
  if (!user.value || !id.value) {
    isSaved.value = false
    return
  }
  const res = await api<Job[]>('/api/jobs/saved')
  if (res.ok && Array.isArray(res.data)) {
    isSaved.value = res.data.some((j) => j.id === id.value)
  } else {
    isSaved.value = false
  }
}

async function toggleSave(): Promise<void> {
  if (!job.value || isOwner.value) return
  if (!user.value) {
    await navigateTo({
      path: '/auth/login',
      query: { redirect: route.fullPath },
    })
    return
  }
  const jid = id.value
  if (!jid) return
  saveLoading.value = true
  try {
    if (isSaved.value) {
      const res = await api(`/api/jobs/${jid}/save`, { method: 'DELETE' })
      if (res.ok) isSaved.value = false
    } else {
      const res = await api(`/api/jobs/${jid}/save`, { method: 'POST' })
      if (res.ok) isSaved.value = true
    }
  } finally {
    saveLoading.value = false
  }
}

async function loadSimilar(jid: string): Promise<void> {
  const res = await api<Job[]>(`/api/jobs/${jid}/similar`, { query: { limit: '6' } })
  if (res.ok && Array.isArray(res.data)) {
    similarJobs.value = res.data
  } else {
    similarJobs.value = []
  }
}

async function syncJobSideEffects(): Promise<void> {
  if (!id.value || !job.value) {
    return
  }
  if (import.meta.client && session.value?.access_token) {
    api(`/api/jobs/${id.value}/view`, { method: 'POST' }).catch(() => {})
  }
  await loadSimilar(id.value)
  await refreshSavedState()
}

async function reloadJobFromApi(): Promise<void> {
  if (!id.value) return
  similarJobs.value = []
  await refreshJob()
  job.value = initialJob.value
  if (!job.value) {
    if (import.meta.client) {
      showNotFound(S.jobNotFound)
    }
    return
  }
  await syncJobSideEffects()
}

async function handleActivate(): Promise<void> {
  if (!id.value) return
  actionLoading.value = true
  try {
    const res = await api(`/api/jobs/${id.value}/activate`, { method: 'POST' })
    if (res.ok) await reloadJobFromApi()
  } finally {
    actionLoading.value = false
  }
}

async function handleApply(): Promise<void> {
  if (!id.value || !user.value) return
  actionLoading.value = true
  try {
    const appRes = await api<{ id: string }>('/api/applications', { method: 'POST', body: { job_id: id.value } })
    if (!appRes.ok) return
    applied.value = true
    capture('job_applied', { job_id: id.value, application_id: appRes.data?.id })
    const roomRes = await api<{ id: string }>('/api/chat/rooms', { method: 'POST', query: { application_id: appRes.data!.id } })
    if (roomRes.ok && roomRes.data?.id) {
      await navigateTo(ROUTES.chatRoom(roomRes.data.id))
    }
  } finally {
    actionLoading.value = false
  }
}

watch(
  initialJob,
  (value) => {
    job.value = value
    if (!value) {
      similarJobs.value = []
      if (import.meta.client && !jobPending.value) {
        showNotFound(S.jobNotFound)
      }
      return
    }
    void syncJobSideEffects()
  },
  { immediate: true },
)

watch(id, () => {
  applied.value = false
})

watch(user, () => {
  void refreshSavedState()
})
</script>
