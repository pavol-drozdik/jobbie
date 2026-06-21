<template>
  <div v-if="authLoading" class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50">
    {{ S.loading }}
  </div>
  <div v-else-if="user" class="min-h-screen bg-marketing-mint font-dmSans text-black">
    <div class="mx-auto box-border w-full max-w-[1400px] px-5 pb-16 pt-0">
      <div class="mt-[30px] flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight text-black sm:text-[32px]">
            {{ S.jobHubTitle }}
          </h1>
          <p class="m-0 mt-2 max-w-2xl text-[15px] leading-relaxed text-black/50">
            {{ S.jobHubPageDescription }}
          </p>
        </div>
        <NuxtLink
          :to="ROUTES.jobNew"
          class="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-marketing-green px-5 font-dmSans text-[14px] font-bold text-white no-underline hover:opacity-95 sm:h-12 sm:px-6 sm:text-[15px]"
        >
          {{ jobs.length ? S.jobHubNewAnother : S.jobHubNewJob }}
        </NuxtLink>
      </div>

      <div v-if="loadError" class="mt-6 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800">
        {{ loadError }}
      </div>

      <div v-if="loading" class="mt-10 space-y-3">
        <div
          v-for="n in 3"
          :key="n"
          class="h-[84px] animate-pulse rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.08)]"
        />
      </div>

      <template v-else-if="!loadError">
        <div v-if="jobs.length === 0" class="mt-10 lg:mt-12">
          <div
            class="rounded-[20px] border border-black/[0.06] bg-marketing-panel px-5 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:px-8 sm:py-7"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div class="flex shrink-0 justify-center sm:pt-0.5">
                <span class="flex size-11 items-center justify-center rounded-full bg-marketing-panel text-marketing-green">
                  <AppIcon name="briefcase" :size="22" />
                </span>
              </div>
              <div class="min-w-0 text-center sm:text-left">
                <p class="m-0 text-[17px] font-bold leading-snug text-black">
                  {{ S.jobHubEmptyCalloutTitle }}
                </p>
                <p class="m-0 mt-2 text-[15px] leading-relaxed text-black/50">
                  {{ S.jobHubEmptyCalloutBody }}
                </p>
                <p class="m-0 mt-4">
                  <NuxtLink
                    :to="ROUTES.jobNew"
                    class="inline-flex items-center justify-center rounded-full bg-marketing-green px-5 py-2.5 text-[14px] font-bold text-white no-underline hover:opacity-95"
                  >
                    {{ S.jobHubEmptyCalloutLink }}
                  </NuxtLink>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="mt-8 sm:mt-10">
          <div
            v-if="showAllDraftsAlert"
            class="mb-8 flex gap-3 rounded-[20px] border border-red-200 bg-red-50 px-4 py-4 sm:gap-4 sm:px-5 sm:py-4"
            role="alert"
          >
            <span class="mt-0.5 shrink-0 text-red-600" aria-hidden="true">
              <AppIcon name="triangle-alert" :size="22" />
            </span>
            <div class="min-w-0">
              <p class="m-0 text-[15px] font-bold leading-snug text-red-950">
                {{ S.jobHubAllDraftsAlertLead }}
              </p>
              <p class="m-0 mt-2 text-[14px] leading-relaxed text-red-900/80">
                {{ S.jobHubAllDraftsAlertBody }}
              </p>
            </div>
          </div>

          <template v-if="hasMultipleSections">
            <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">
              {{ S.jobHubSectionDraft }}
            </h2>
            <ul v-if="draftJobs.length" class="m-0 mb-8 list-none space-y-2.5 p-0 sm:mb-10 sm:space-y-3">
              <li v-for="job in draftJobs" :key="job.id">
                <JobHubRow
                  :job="job"
                  :date-line="formatRowDateLine(job)"
                  :status-label="jobStatusLabel(job)"
                  @rename="openRename(job)"
                  @delete="remove(job.id)"
                />
              </li>
            </ul>
            <template v-if="publishedJobs.length">
              <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">
                {{ S.jobHubSectionPublished }}
              </h2>
              <ul class="m-0 mb-8 list-none space-y-2.5 p-0 sm:mb-10 sm:space-y-3">
                <li v-for="job in publishedJobs" :key="job.id">
                  <JobHubRow
                    :job="job"
                    :date-line="formatRowDateLine(job)"
                    :status-label="jobStatusLabel(job)"
                    @rename="openRename(job)"
                    @delete="remove(job.id)"
                  />
                </li>
              </ul>
            </template>
            <template v-if="inactiveJobs.length">
              <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">
                {{ S.jobHubSectionInactive }}
              </h2>
              <ul class="m-0 list-none space-y-2.5 p-0 sm:space-y-3">
                <li v-for="job in inactiveJobs" :key="job.id">
                  <JobHubRow
                    :job="job"
                    :date-line="formatRowDateLine(job)"
                    :status-label="jobStatusLabel(job)"
                    @rename="openRename(job)"
                    @delete="remove(job.id)"
                  />
                </li>
              </ul>
            </template>
          </template>

          <ul v-else class="m-0 list-none space-y-2.5 p-0 sm:space-y-3">
            <li v-for="job in jobs" :key="job.id">
              <JobHubRow
                :job="job"
                :date-line="formatRowDateLine(job)"
                :status-label="jobStatusLabel(job)"
                @rename="openRename(job)"
                @delete="remove(job.id)"
              />
            </li>
          </ul>
        </div>
      </template>

      <AppConfirmDialog
        v-model:open="deleteDialogOpen"
        variant="confirm"
        :title="S.dialogConfirmTitle"
        :message="S.jobHubDeleteConfirmLead"
        :detail="S.jobHubDeleteConfirmDetail"
        :confirm-text="S.jobHubDeleteJob"
        :cancel-text="S.cancel"
        confirm-danger
        @confirm="confirmRemove"
      />

      <Teleport to="body">
        <div
          v-if="renameDialogOpen"
          class="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-0 font-dmSans antialiased sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          @click.self="renameDialogOpen = false"
        >
          <div
            class="w-full max-w-md rounded-t-2xl border border-black/10 bg-white px-6 py-8 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:px-8 sm:py-7"
            @click.stop
          >
            <h2 class="m-0 text-center text-xl font-extrabold text-black">
              {{ S.jobHubRenameDialogTitle }}
            </h2>
            <label class="mt-6 block text-left text-[13px] font-bold text-black/55" for="job-hub-rename-input">
              {{ S.profileColName }}
            </label>
            <input
              id="job-hub-rename-input"
              v-model="renameTitle"
              type="text"
              maxlength="120"
              class="addjob-input cv-field mt-2 w-full"
              @keydown.enter.prevent="saveRename"
            />
            <div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                class="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white px-5 text-[15px] font-semibold text-black/75 hover:bg-neutral-50 sm:flex-initial sm:min-w-[7.5rem]"
                @click="renameDialogOpen = false"
              >
                {{ S.cancel }}
              </button>
              <button
                type="button"
                class="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-marketing-green px-5 text-[15px] font-bold text-white hover:opacity-95 sm:flex-initial sm:min-w-[7.5rem]"
                :disabled="!renameTitle.trim() || renameSaving"
                @click="saveRename"
              >
                {{ S.jobHubRenameSave }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
  <LoggedOutFeatureHero
    v-else
    title="Vytvor pracovnú ponuku"
    description="Pridaj pracovnú ponuku a oslov vhodných kandidátov."
    :benefits="[
      'Rýchle vytvorenie pracovnej ponuky',
      'Zobrazenie ponuky relevantným uchádzačom',
      'Jednoduchá správa inzerátu',
    ]"
    image-src="/home-design/job-post-illustration.png"
    image-alt="Vytvorenie pracovnej ponuky"
    :redirect-path="redirectPath"
  />
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { Job } from '~/utils/job'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'
import JobHubRow from '~/components/job-post/JobHubRow.vue'

definePageMeta({ layout: 'app', middleware: ['customer-only'] })

const route = useRoute()
const router = useRouter()
const { user, loading: authLoading, session, refreshUser } = useAuth()
const { api } = useApi()
const { jobs, loading, loadError, loadJobs } = useProfileMyJobs()

const redirectPath = computed(() => route.fullPath || ROUTES.jobHub)

const draftJobs = computed(() => jobs.value.filter((j) => j.is_draft))
const publishedJobs = computed(() =>
  jobs.value.filter((j) => !j.is_draft && j.is_active),
)
const inactiveJobs = computed(() =>
  jobs.value.filter((j) => !j.is_draft && !j.is_active),
)
const showAllDraftsAlert = computed(
  () => jobs.value.length > 0 && jobs.value.every((j) => j.is_draft),
)
const hasMultipleSections = computed(
  () =>
    draftJobs.value.length > 0 &&
    (publishedJobs.value.length > 0 || inactiveJobs.value.length > 0),
)

const renameDialogOpen = ref(false)
const renameJobId = ref<string | null>(null)
const renameTitle = ref('')
const renameSaving = ref(false)
const deleteDialogOpen = ref(false)
const deletePendingId = ref<string | null>(null)

function formatSkDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(d)
}

function formatRowDateLine(job: Job): string {
  const created = formatSkDate(job.created_at)
  if (created) return `${S.jobHubCreatedLabel} ${created}`
  const updated = formatSkDate(job.updated_at)
  if (updated) return `${S.jobHubUpdatedLabel} ${updated}`
  return ''
}

function jobStatusLabel(job: Job): string {
  if (job.is_draft) return S.statusDraft
  if (job.is_active) return S.statusActive
  return S.statusInactive
}

function openRename(job: Job): void {
  renameJobId.value = job.id
  renameTitle.value = job.title?.trim() || S.jobHubDefaultTitle
  renameDialogOpen.value = true
}

async function saveRename(): Promise<void> {
  const id = renameJobId.value
  const title = renameTitle.value.trim()
  if (!id || !title) return
  renameSaving.value = true
  try {
    const res = await api(`/api/jobs/${id}`, {
      method: 'PATCH',
      body: { title },
    })
    if (!res.ok) {
      loadError.value = res.body?.slice(0, 120) ?? 'Chyba'
      return
    }
    renameDialogOpen.value = false
    renameJobId.value = null
    await loadJobs()
  } finally {
    renameSaving.value = false
  }
}

function remove(id: string): void {
  deletePendingId.value = id
  deleteDialogOpen.value = true
}

async function confirmRemove(): Promise<void> {
  const id = deletePendingId.value
  deletePendingId.value = null
  if (!id) return
  const res = await api(`/api/jobs/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    loadError.value = res.body?.slice(0, 120) ?? 'Chyba'
    return
  }
  await loadJobs()
}

onMounted(async () => {
  const q = route.query.edit
  if (typeof q === 'string' && q.length > 0) {
    await router.replace({ path: ROUTES.jobWizard(q) })
    return
  }
  if (!user.value && session.value) {
    await refreshUser()
  }
  if (user.value) {
    await loadJobs()
  }
})

watch(user, (u) => {
  if (u) void loadJobs()
})
</script>
