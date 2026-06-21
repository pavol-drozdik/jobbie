<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    title="Dostávaj pracovné ponuky na email"
    description="Nastav si upozornenia a dostávaj nové pracovné ponuky priamo na email."
    :benefits="[
      'Nové ponuky podľa tvojich preferencií',
      'Upozornenia priamo do emailu',
      'Jednoduché zapnutie alebo vypnutie upozornení',
    ]"
    image-src="/home-design/job-alerts-illustration.png"
    image-alt="Upozornenia na pracovné ponuky"
    :redirect-path="redirectPath"
  />
  <div v-else class="min-h-screen bg-marketing-mint font-dmSans text-black">
    <div class="mx-auto box-border w-full max-w-[1400px] px-5 pb-16 pt-0">
      <template v-if="employerGate">
        <div class="mt-[30px]">
          <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight text-black sm:text-[32px]">
            {{ S.jobEmailAlertsPageTitle }}
          </h1>
        </div>
        <div class="mt-10 lg:mt-12">
          <div
            class="rounded-[20px] border border-black/[0.06] border-l-[4px] border-l-marketing-green bg-white pl-5 pr-6 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:pl-6 sm:pr-8 sm:py-7"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div class="flex shrink-0 justify-center sm:pt-0.5">
                <span class="flex size-11 items-center justify-center rounded-full bg-marketing-panel text-marketing-green">
                  <AppIcon name="bell" :size="22" />
                </span>
              </div>
              <div class="min-w-0 text-center sm:text-left">
                <p class="m-0 text-[17px] font-bold leading-snug text-black">
                  {{ S.jobAlertsEmployerOnly }}
                </p>
                <p class="m-0 mt-2 text-[15px] leading-relaxed text-black/50">
                  {{ S.jobAlertsEmployerGateBody }}
                </p>
                <div class="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <NuxtLink
                    :to="ROUTES.find"
                    class="inline-flex h-11 items-center justify-center rounded-full bg-marketing-green px-5 text-[14px] font-bold text-white no-underline hover:opacity-95"
                  >
                    {{ S.jobAlertsEmployerCtaFindJobs }}
                  </NuxtLink>
                  <NuxtLink
                    to="/nastavenia"
                    class="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-[14px] font-semibold text-black/80 no-underline hover:bg-neutral-50"
                  >
                    {{ S.jobAlertsEmployerCtaProfile }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="mt-[30px] flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div class="min-w-0">
            <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight text-black sm:text-[32px]">
              {{ S.jobEmailAlertsPageTitle }}
            </h1>
            <p class="m-0 mt-2 max-w-2xl text-[15px] leading-relaxed text-black/50">
              {{ S.jobEmailAlertsPageDescription }}
            </p>
          </div>
          <NuxtLink
            to="/ponuky-na-email/novy"
            class="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-marketing-green px-5 font-dmSans text-[14px] font-bold text-white no-underline hover:opacity-95 sm:h-12 sm:px-6 sm:text-[15px]"
          >
            {{ S.jobEmailAlertsSubscribeCta }}
          </NuxtLink>
        </div>

        <div
          v-if="savedBanner"
          class="mt-6 rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[15px] font-semibold text-emerald-900"
          role="status"
        >
          {{ S.jobEmailAlertsSaved }}
        </div>

        <div v-if="loadError" class="mt-6 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800">
          {{ loadError }}
          <button
            type="button"
            class="ml-2 font-semibold text-marketing-green underline"
            @click="refresh()"
          >
            {{ S.jobEmailAlertsRetryLoad }}
          </button>
        </div>

        <div v-if="loading" class="mt-10 space-y-3">
          <div
            v-for="n in 3"
            :key="n"
            class="h-[84px] animate-pulse rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.08)]"
          />
        </div>

        <template v-else-if="!loadError">
          <div v-if="list.length === 0" class="mt-10 lg:mt-12">
            <div
              class="rounded-[20px] border border-black/[0.06] border-l-[4px] border-l-marketing-green bg-white pl-5 pr-6 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:pl-6 sm:pr-8 sm:py-7"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
                <div class="flex shrink-0 justify-center sm:pt-0.5">
                  <span class="flex size-11 items-center justify-center rounded-full bg-marketing-panel text-marketing-green">
                    <AppIcon name="bell" :size="22" />
                  </span>
                </div>
                <div class="min-w-0 text-center sm:text-left">
                  <p class="m-0 text-[17px] font-bold leading-snug text-black">
                    {{ S.jobEmailAlertsEmptyTitle }}
                  </p>
                  <p class="m-0 mt-2 text-[15px] leading-relaxed text-black/50">
                    {{ S.jobEmailAlertsEmptyDescription }}
                  </p>
                  <p class="m-0 mt-4">
                    <NuxtLink
                      to="/ponuky-na-email/novy"
                      class="inline-flex items-center justify-center rounded-full bg-marketing-green px-5 py-2.5 text-[14px] font-bold text-white no-underline hover:opacity-95"
                    >
                      {{ S.jobEmailAlertsSubscribeCta }}
                    </NuxtLink>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="mt-8 sm:mt-10">
            <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">
              {{ S.jobEmailAlertsListTitle }}
            </h2>
            <ul class="m-0 list-none space-y-2.5 p-0 sm:space-y-3">
              <li v-for="a in list" :key="a.id">
                <JobEmailAlertHubRow
                  :alert="a"
                  :meta-line="formatAlertMeta(a)"
                  :date-line="formatAlertDateLine(a)"
                  :category-slug="alertCategorySlug(a)"
                  @toggle-pause="togglePause(a)"
                  @delete="requestDelete(a)"
                />
              </li>
            </ul>
          </div>
        </template>
      </template>

      <AppConfirmDialog
        v-model:open="deleteDialogOpen"
        variant="confirm"
        :title="S.dialogConfirmTitle"
        :message="S.jobEmailAlertsDeleteConfirm"
        :confirm-text="S.jobAlertsDelete"
        :cancel-text="S.cancel"
        confirm-danger
        @confirm="confirmDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import JobEmailAlertHubRow from '~/components/job-alerts/JobEmailAlertHubRow.vue'
import {
  formatAlertDateLine,
  formatAlertMeta,
} from '~/composables/useJobEmailAlertFormModel'
import { useJobEmailAlerts, type JobEmailAlertDto } from '~/composables/useJobEmailAlerts'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'
definePageMeta({ layout: 'app', middleware: ['worker-only'] })

usePageSeo(() => ({
  title: S.seoJobAlertsTitle,
  description: S.seoJobAlertsDescription,
  canonicalPath: '/ponuky-na-email',
}))

const route = useRoute()
const redirectPath = computed(() => route.fullPath || '/ponuky-na-email')
const { user, profile, loading: authLoading } = useAuth()
const { list, loading, loadError, refresh, updateAlert, deleteAlert } = useJobEmailAlerts()

const deleteDialogOpen = ref(false)
const deletePendingId = ref<string | null>(null)

const savedBanner = computed(() => route.query.saved === '1')

const employerGate = computed(() => {
  if (!user.value || authLoading.value) {
    return false
  }
  return Boolean(profile.value?.customer_role) && !profile.value?.worker_role
})

const prefillKeys = [
  'q',
  'location',
  'radius',
  'job_type',
  'jobTypes',
  'work_mode',
  'workModes',
  'category',
  'salaryMin',
]

function hasPrefillQuery(): boolean {
  return prefillKeys.some((k) => {
    const v = route.query[k]
    return typeof v === 'string' && v.length > 0
  })
}

function alertCategorySlug(a: JobEmailAlertDto): string | null {
  const fromList = (a.categories ?? []).map((c) => c.trim()).filter(Boolean)
  if (fromList.length > 0) {
    return fromList[0]!
  }
  const legacy = (a.category ?? '').trim()
  return legacy.length > 0 && legacy !== 'all' ? legacy : null
}

async function togglePause(a: JobEmailAlertDto): Promise<void> {
  await updateAlert(a.id, { is_active: !a.is_active })
  await refresh()
}

function requestDelete(a: JobEmailAlertDto): void {
  deletePendingId.value = a.id
  deleteDialogOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const id = deletePendingId.value
  deletePendingId.value = null
  if (!id) {
    return
  }
  await deleteAlert(id)
  await refresh()
}

watch(
  () => [user.value?.id, employerGate.value] as const,
  async () => {
    if (!user.value || employerGate.value) {
      return
    }
    if (hasPrefillQuery()) {
      await navigateTo({ path: '/ponuky-na-email/novy', query: { ...route.query } })
      return
    }
    await refresh()
  },
  { immediate: true },
)

</script>
