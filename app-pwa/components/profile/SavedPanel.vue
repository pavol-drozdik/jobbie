<template>
  <div
    class="overflow-hidden rounded-[20px] bg-white font-dmSans shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]"
  >
    <p v-if="loading" class="px-8 py-12 text-center text-base text-black/50">{{ S.loading }}</p>
    <template v-else>
      <div
        class="relative overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)] px-8 py-7 text-white max-[480px]:px-6"
      >
        <div
          class="pointer-events-none absolute -right-12 -top-16 size-[200px] rounded-full bg-white/[0.08]"
          aria-hidden="true"
        />
        <p class="relative m-0 text-[12px] font-bold uppercase tracking-[0.1em] text-white/75">
          {{ S.profileNavSaved }}
        </p>
        <div class="relative mt-3 flex flex-wrap items-end gap-5">
          <p class="m-0 text-[52px] font-extrabold leading-none tracking-tight">
            {{ totalSaved }}
          </p>
          <p class="m-0 pb-1 text-[15px] font-medium leading-relaxed text-white/85">
            {{ countsSummary }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-8 px-8 py-7 max-[480px]:px-6">
        <p v-if="loadError" class="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ loadError }}
        </p>

        <section class="flex flex-col gap-4">
          <div class="flex items-center gap-2.5">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marketing-panel">
              <AppIcon name="building" :size="18" class="text-marketing-green" />
            </div>
            <h3 class="m-0 text-[18px] font-extrabold text-black">
              {{ S.profileSavedCompaniesTitle }}
            </h3>
            <span
              v-if="savedCompanies.length > 0"
              class="ml-auto rounded-full bg-marketing-surface px-2.5 py-0.5 text-[13px] font-bold text-black/45"
            >
              {{ savedCompanies.length }}
            </span>
          </div>

          <div
            v-if="savedCompanies.length === 0"
            class="flex flex-col items-center rounded-2xl bg-marketing-surface px-6 py-10 text-center"
          >
            <div class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-marketing-panel">
              <AppIcon name="building" :size="24" class="text-marketing-green/50" />
            </div>
            <p class="m-0 text-[16px] font-semibold text-black/60">{{ S.profileSavedCompaniesEmpty }}</p>
          </div>

          <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
            <li v-for="row in savedCompanies" :key="row.company_id">
              <NuxtLink
                :to="ROUTES.publicProfile(row.company_id)"
                class="group flex items-center gap-4 rounded-2xl bg-marketing-surface px-4 py-4 no-underline transition-colors hover:bg-marketing-mint max-[480px]:px-3.5"
              >
                <div
                  class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm"
                >
                  <img
                    v-if="companyThumb(row)"
                    :src="companyThumb(row)!"
                    alt=""
                    class="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  >
                  <span v-else class="font-dmSans text-lg font-bold text-black/25">{{ companyInitials(row) }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="m-0 truncate text-[17px] font-bold text-black group-hover:text-marketing-green">
                    {{ companyTitle(row) }}
                  </p>
                  <p
                    v-if="row.location?.trim() || row.registered_office?.trim()"
                    class="mt-1 truncate text-[14px] text-black/45"
                  >
                    {{ row.location?.trim() || row.registered_office?.trim() }}
                  </p>
                  <span
                    v-if="row.registry_verified"
                    class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-marketing-mint px-2 py-0.5 text-[11px] font-bold text-marketing-green"
                  >
                    <AppIcon name="check-circle" :size="11" />
                    {{ S.badgeRegistryVerified }}
                  </span>
                </div>
                <AppIcon
                  name="arrow-right"
                  :size="18"
                  class="shrink-0 text-marketing-green transition-transform group-hover:translate-x-0.5"
                />
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-4 border-t border-black/[0.07] pt-8">
          <div class="flex items-center gap-2.5">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marketing-panel">
              <AppIcon name="briefcase" :size="18" class="text-marketing-green" />
            </div>
            <h3 class="m-0 text-[18px] font-extrabold text-black">
              {{ S.profileSavedJobsTitle }}
            </h3>
            <span
              v-if="savedJobs.length > 0"
              class="ml-auto rounded-full bg-marketing-surface px-2.5 py-0.5 text-[13px] font-bold text-black/45"
            >
              {{ savedJobs.length }}
            </span>
          </div>

          <div
            v-if="savedJobs.length === 0"
            class="flex flex-col items-center rounded-2xl bg-marketing-surface px-6 py-10 text-center"
          >
            <div class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-marketing-panel">
              <AppIcon name="bookmark" :size="24" class="text-marketing-green/50" />
            </div>
            <p class="m-0 text-[16px] font-semibold text-black/60">{{ S.profileSavedJobsEmpty }}</p>
            <NuxtLink
              :to="ROUTES.find"
              class="mt-4 text-[15px] font-bold text-marketing-green no-underline hover:underline"
            >
              {{ S.profileSavedBrowseJobsCta }}
            </NuxtLink>
          </div>

          <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
            <li
              v-for="job in savedJobs"
              :key="job.id"
              class="flex flex-col gap-3 rounded-2xl bg-marketing-surface px-4 py-4 sm:flex-row sm:items-center max-[480px]:px-3.5"
            >
              <NuxtLink
                :to="ROUTES.jobDetail(job.id)"
                class="flex min-w-0 flex-1 items-center gap-4 no-underline"
              >
                <div
                  class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-marketing-panel"
                >
                  <CategoryIcon :category="job.category" :size="20" icon-class="text-marketing-green" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="m-0 truncate text-[17px] font-bold text-black hover:text-marketing-green">
                    {{ job.title }}
                  </p>
                  <p class="mt-1 truncate text-[14px] text-black/45">
                    {{ job.employer_name || '—' }} · {{ getJobCardCityDisplay(job) }}
                  </p>
                </div>
              </NuxtLink>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                class="w-full shrink-0 border-black/10 text-black/55 hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:w-auto"
                :disabled="jobBusyId === job.id"
                :aria-label="S.profileUnsaveJobAria"
                @click="unsaveJob(job.id)"
              >
                {{ jobBusyId === job.id ? S.loading : S.profileRemoveSavedJob }}
              </AppButton>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { employerInitials, getJobCardCityDisplay, type Job } from '~/utils/job'

export type SavedCompanyRow = {
  company_id: string
  created_at: string
  display_name: string | null
  company_name: string | null
  logo_url: string | null
  avatar_url: string | null
  location: string | null
  description: string | null
  registered_office: string | null
  registry_verified: boolean
}

const { session } = useAuth()
const { api } = useApi()

const loading = ref(true)
const loadError = ref<string | null>(null)
const savedCompanies = ref<SavedCompanyRow[]>([])
const savedJobs = ref<Job[]>([])
const jobBusyId = ref<string | null>(null)

const totalSaved = computed(() => savedCompanies.value.length + savedJobs.value.length)

const countsSummary = computed((): string => {
  const c = savedCompanies.value.length
  const j = savedJobs.value.length
  return S.profileSavedCountsSummary
    .replace('{companies}', String(c))
    .replace('{jobs}', String(j))
})

function companyTitle(row: SavedCompanyRow): string {
  return row.company_name?.trim() || row.display_name?.trim() || '—'
}

function companyThumb(row: SavedCompanyRow): string | null {
  const u = row.logo_url?.trim() || row.avatar_url?.trim()
  return u || null
}

function companyInitials(row: SavedCompanyRow): string {
  return employerInitials(companyTitle(row))
}

async function load(): Promise<void> {
  if (!session.value?.access_token) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const [cRes, jRes] = await Promise.all([
      api<SavedCompanyRow[]>('/api/saved/companies'),
      api<Job[]>('/api/jobs/saved'),
    ])
    savedCompanies.value = cRes.ok && Array.isArray(cRes.data) ? cRes.data : []
    savedJobs.value = jRes.ok && Array.isArray(jRes.data) ? jRes.data : []
    if (!cRes.ok && !jRes.ok) {
      loadError.value = S.firmyErrorGeneric
    }
  } finally {
    loading.value = false
  }
}

async function unsaveJob(jobId: string): Promise<void> {
  jobBusyId.value = jobId
  try {
    const res = await api(`/api/jobs/${jobId}/save`, { method: 'DELETE' })
    if (res.ok) {
      savedJobs.value = savedJobs.value.filter((j) => j.id !== jobId)
    }
  } finally {
    jobBusyId.value = null
  }
}

onMounted(() => {
  void load()
})
</script>
