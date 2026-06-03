<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    :title="S.applicantsPageTitle"
    description="Prezeraj, filtruj a spravuj uchádzačov o tvoje pracovné pozície."
    :benefits="[
      'Prehľad uchádzačov podľa ponuky',
      'Filtrovanie a správa stavov prihlásení',
      'Export zoznamu na pohovor',
    ]"
    image-src="/home-design/feature-employer.webp"
    image-alt="Správa uchádzačov"
    :redirect-path="redirectPath"
  />
  <div v-else class="print-page mx-auto max-w-[900px] px-5 py-8 font-dmSans text-black">
    <div class="no-print mb-6 flex flex-wrap gap-3">
      <AppBackLink :to="ROUTES.applicantsJob(jobId)" :label="S.applicantsPageTitle" />
      <AppButton @click="print">{{ S.applicantsPrint }}</AppButton>
      <AppButton variant="outline" :disabled="downloadingExcel" @click="downloadExcel">
        {{ downloadingExcel ? S.applicantsExportInterviewExcelLoading : S.applicantsExportInterviewExcel }}
      </AppButton>
      <AppButton variant="outline" :disabled="downloadingPdf" @click="downloadPdf">PDF</AppButton>
    </div>

    <template v-if="data">
      <header class="mb-8 border-b border-black/20 pb-4">
        <h1 class="m-0 text-2xl font-bold">{{ S.applicantsPrintTitle }}</h1>
        <p class="mt-2 text-sm">{{ data.job_title }} — {{ data.company_name }}</p>
        <p class="text-xs text-black/50">Vygenerované {{ formatDate(data.generated_at) }}</p>
      </header>

      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-black/30 text-left">
            <th class="py-2 pr-2">Meno</th>
            <th class="py-2 pr-2">Kontakt</th>
            <th class="py-2 pr-2">Mesto</th>
            <th class="py-2 pr-2">Prihlásenie</th>
            <th class="py-2">Poznámka / pohovor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data.items" :key="row.application_id" class="border-b border-black/10">
            <td class="py-3 pr-2 align-top font-medium">{{ row.full_name }}</td>
            <td class="py-3 pr-2 align-top text-xs">
              <span v-if="row.phone">{{ row.phone }}<br></span>
              <span v-if="row.email">{{ row.email }}</span>
            </td>
            <td class="py-3 pr-2 align-top">{{ row.city || '—' }}</td>
            <td class="py-3 pr-2 align-top text-xs">
              {{ formatDate(row.applied_at) }}
              <span v-if="row.availability"><br>{{ row.availability }}</span>
              <span v-if="row.salary_display"><br>{{ row.salary_display }}</span>
              <span v-if="row.top_skills?.length"><br>{{ row.top_skills.join(', ') }}</span>
            </td>
            <td class="py-3 align-top text-xs">
              <span v-if="row.internal_note">{{ row.internal_note }}</span>
              <div class="mt-4 h-8 border-b border-black/30" />
              <div class="mt-2 h-8 border-b border-black/30" />
            </td>
          </tr>
        </tbody>
      </table>
    </template>
    <p v-else-if="!loading" class="text-black/50">Žiadni uchádzači na pohovor.</p>
    <p v-else class="text-black/50">{{ S.loading }}</p>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { EmployerPrintListResponse } from '~/types/employer-applicants'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['company-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.applicants)
const { user, loading: authLoading } = useAuth()
const jobId = computed(() => String(route.params.jobId))
const { fetchPrintList, downloadInvitedPdf, downloadApplicantsExcel } = useEmployerApplicants()

const data = ref<EmployerPrintListResponse | null>(null)
const loading = ref(true)
const downloadingPdf = ref(false)
const downloadingExcel = ref(false)

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sk-SK')
  } catch {
    return iso
  }
}

function print(): void {
  if (import.meta.client) window.print()
}

function printListQuery(): Record<string, string> {
  const out: Record<string, string> = {
    status: 'interview_invited',
    sort: 'applied_at_desc',
    has_cv: 'any',
  }
  const { status, sort, has_cv, q } = route.query
  if (typeof status === 'string' && status) out.status = status
  if (typeof sort === 'string' && sort) out.sort = sort
  if (typeof has_cv === 'string' && has_cv) out.has_cv = has_cv
  if (typeof q === 'string' && q.trim()) out.q = q.trim()
  return out
}

function printListIds(): string[] | undefined {
  const idsParam = route.query.ids
  if (typeof idsParam !== 'string' || !idsParam) return undefined
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
  return ids.length ? ids : undefined
}

async function downloadPdf(): Promise<void> {
  downloadingPdf.value = true
  await downloadInvitedPdf(jobId.value, printListQuery(), printListIds())
  downloadingPdf.value = false
}

async function downloadExcel(): Promise<void> {
  downloadingExcel.value = true
  await downloadApplicantsExcel(jobId.value, printListQuery(), printListIds())
  downloadingExcel.value = false
}

onMounted(async () => {
  if (!user.value) {
    loading.value = false
    return
  }
  data.value = await fetchPrintList(jobId.value, printListQuery(), printListIds())
  loading.value = false
})

useHead({
  title: () => S.applicantsPrintTitle,
  style: [
    {
      children: `@media print { .no-print { display: none !important; } body { background: white; } }`,
    },
  ],
})
</script>
