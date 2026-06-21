<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    :title="S.navCvBuilderTitle"
    :description="S.navCvBuilderDescription"
    :benefits="[
      'Profesionálne šablóny životopisu',
      'Náhľad a úpravy kedykoľvek',
      'Zverejnenie pre zamestnávateľov na Jobbie',
    ]"
    image-src="/home-design/cv-illustration.png"
    image-alt="Tvorba životopisu"
    :redirect-path="redirectPath"
  />
  <div v-else class="min-h-screen bg-marketing-mint font-dmSans text-black">
    <div class="mx-auto box-border w-full max-w-[1400px] px-5 pb-16 pt-0">
      <div class="mt-[30px] flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight text-black sm:text-[32px]">
            {{ S.cvHubTitle }}
          </h1>
          <p class="m-0 mt-2 max-w-2xl text-[15px] leading-relaxed text-black/50">
            {{ S.cvHubPageDescription }}
          </p>
        </div>
        <NuxtLink
          :to="ROUTES.cvNew"
          class="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-marketing-green px-5 font-dmSans text-[14px] font-bold text-white no-underline hover:opacity-95 sm:h-12 sm:px-6 sm:text-[15px]"
        >
          {{ rows.length ? S.cvHubNewCvAnother : S.cvNewCv }}
        </NuxtLink>
      </div>

      <div v-if="err" class="mt-6 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800">
        {{ err }}
        <button
          type="button"
          class="ml-2 font-semibold text-marketing-green underline"
          @click="load()"
        >
          {{ S.cvDbErrorRetry }}
        </button>
      </div>

      <div v-if="loading" class="mt-10 space-y-3">
        <div
          v-for="n in 3"
          :key="n"
          class="h-[84px] animate-pulse rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.08)]"
        />
      </div>

      <template v-else-if="!err">
        <div v-if="rows.length === 0" class="mt-10 lg:mt-12">
          <div
            class="rounded-[20px] border border-black/[0.06] bg-marketing-panel px-5 py-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] sm:px-8 sm:py-7"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div class="flex shrink-0 justify-center sm:pt-0.5">
                <span class="flex size-11 items-center justify-center rounded-full bg-marketing-panel text-marketing-green">
                  <AppIcon name="file-lines" :size="22" />
                </span>
              </div>
              <div class="min-w-0 text-center sm:text-left">
                <p class="m-0 text-[17px] font-bold leading-snug text-black">
                  {{ S.cvHubEmptyCalloutTitle }}
                </p>
                <p class="m-0 mt-2 text-[15px] leading-relaxed text-black/50">
                  {{ S.cvHubEmptyCalloutBody }}
                </p>
                <p class="m-0 mt-4">
                  <NuxtLink
                    :to="ROUTES.cvNew"
                    class="inline-flex items-center justify-center rounded-full bg-marketing-green px-5 py-2.5 text-[14px] font-bold text-white no-underline hover:opacity-95"
                  >
                    {{ S.cvHubEmptyCalloutLink }}
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
                {{ S.cvHubAllDraftsAlertLead }}
              </p>
              <p class="m-0 mt-2 text-[14px] leading-relaxed text-red-900/80">
                {{ S.cvHubAllDraftsAlertBody }}
              </p>
            </div>
          </div>

          <template v-if="draftRows.length && doneRows.length">
            <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">
              {{ S.cvHubSectionDraft }}
            </h2>
            <ul class="m-0 mb-8 list-none space-y-2.5 p-0 sm:mb-10 sm:space-y-3">
              <li v-for="c in draftRows" :key="c.id">
                <CvHubRow
                  :row="c"
                  :template-label="templateLabel(c.template_key)"
                  :swatch-class="templateSwatchClass(c.template_key)"
                  :date-line="formatRowDateLine(c)"
                  :preview-busy="previewBusyId === c.id"
                  @preview="onPreview(c.id)"
                  @change-template="onChangeTemplate(c.id)"
                  @rename="openRename(c)"
                  @delete="remove(c.id)"
                />
              </li>
            </ul>
            <h2 class="m-0 mb-2.5 px-0.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30">
              {{ S.cvHubSectionDone }}
            </h2>
            <ul class="m-0 list-none space-y-2.5 p-0 sm:space-y-3">
              <li v-for="c in doneRows" :key="c.id">
                <CvHubRow
                  :row="c"
                  :template-label="templateLabel(c.template_key)"
                  :swatch-class="templateSwatchClass(c.template_key)"
                  :date-line="formatRowDateLine(c)"
                  :preview-busy="previewBusyId === c.id"
                  @preview="onPreview(c.id)"
                  @change-template="onChangeTemplate(c.id)"
                  @rename="openRename(c)"
                  @delete="remove(c.id)"
                />
              </li>
            </ul>
          </template>

          <ul v-else class="m-0 list-none space-y-2.5 p-0 sm:space-y-3">
            <li v-for="c in rows" :key="c.id">
              <CvHubRow
                :row="c"
                :template-label="templateLabel(c.template_key)"
                :swatch-class="templateSwatchClass(c.template_key)"
                :date-line="formatRowDateLine(c)"
                :preview-busy="previewBusyId === c.id"
                @preview="onPreview(c.id)"
                @change-template="onChangeTemplate(c.id)"
                @rename="openRename(c)"
                @delete="remove(c.id)"
              />
            </li>
          </ul>
        </div>
      </template>

      <AppConfirmDialog
        v-model:open="deleteDialogOpen"
        variant="confirm"
        :title="S.dialogConfirmTitle"
        :message="S.cvDeleteCvConfirmLead"
        :detail="S.cvDeleteCvConfirmDetail"
        :confirm-text="S.cvDeleteCv"
        :cancel-text="S.cancel"
        confirm-danger
        @confirm="confirmRemove"
      />
      <AppConfirmDialog
        v-model:open="previewNoticeOpen"
        variant="alert"
        :title="S.dialogNoticeTitle"
        :message="S.cvPreviewPopupBlocked"
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
              {{ S.cvHubRenameDialogTitle }}
            </h2>
            <label class="mt-6 block text-left text-[13px] font-bold text-black/55" for="cv-hub-rename-input">
              {{ S.cvCvTitle }}
            </label>
            <input
              id="cv-hub-rename-input"
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
                {{ S.cvHubRenameSave }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { CvListItemResponseDto, CvTemplateKey, CvWizardStep } from '~/types/cv'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['worker-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.cvHub)
const { user, loading: authLoading } = useAuth()
const { listCvs, deleteCv, patchCv, patchProgress } = useCv()
const { openPreview } = useCvHubPreview()

const rows = ref<CvListItemResponseDto[]>([])
const err = ref<string | null>(null)
const loading = ref(true)
const deleteDialogOpen = ref(false)
const deletePendingId = ref<string | null>(null)
const previewBusyId = ref<string | null>(null)
const previewNoticeOpen = ref(false)
const renameDialogOpen = ref(false)
const renameCvId = ref<string | null>(null)
const renameTitle = ref('')
const renameSaving = ref(false)

const draftRows = computed(() => rows.value.filter((c) => c.wizard_step !== 'final'))
const doneRows = computed(() => rows.value.filter((c) => c.wizard_step === 'final'))
const showAllDraftsAlert = computed(
  () => rows.value.length > 0 && rows.value.every((c) => c.wizard_step !== 'final'),
)

function templateLabel(k: CvTemplateKey): string {
  const m: Record<CvTemplateKey, string> = {
    modern: S.cvTemplateModern,
    minimal: S.cvTemplateMinimal,
    professional: S.cvTemplateProfessional,
    creative: S.cvTemplateCreative,
    elegant: S.cvTemplateElegant,
    classic: S.cvTemplateClassic,
  }
  return m[k] ?? k
}

function templateSwatchClass(k: CvTemplateKey): string {
  const m: Record<CvTemplateKey, string> = {
    modern: 'bg-gradient-to-br from-[#17324a] to-[#102432]',
    minimal: 'bg-gradient-to-br from-slate-200 to-white border border-black/10',
    professional: 'bg-gradient-to-br from-[#111111] to-[#333333]',
    creative: 'bg-gradient-to-br from-[#17324a] to-[#102432]',
    elegant: 'bg-gradient-to-br from-[#dcc2a2] to-[#f8f5f0]',
    classic: 'bg-gradient-to-br from-[#111111] to-[#333333]',
  }
  return m[k] ?? 'bg-gradient-to-br from-[#17324a] to-[#102432]'
}

function formatSkDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d)
}

function formatRowDateLine(c: CvListItemResponseDto): string {
  const created = formatSkDate(c.created_at)
  if (created) return `${S.cvHubCreatedLabel} ${created}`
  const updated = formatSkDate(c.updated_at)
  if (updated) return `${S.cvHubUpdatedLabel} ${updated}`
  return ''
}

async function load(): Promise<void> {
  loading.value = true
  err.value = null
  try {
    const list = await listCvs()
    rows.value = list.map((r) => {
      const raw = r as CvListItemResponseDto & { wizard_step?: string }
      return {
        ...raw,
        wizard_step: normalizeWizardStep(raw.wizard_step),
        created_at: raw.created_at ?? raw.updated_at,
      }
    })
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Chyba'
  } finally {
    loading.value = false
  }
}

function normalizeWizardStep(s: string | undefined): CvWizardStep {
  if (s === 'editor' || s === 'final') return s
  return 'template'
}

async function onPreview(cvId: string): Promise<void> {
  previewBusyId.value = cvId
  const result = await openPreview(cvId)
  previewBusyId.value = null
  if (result === 'blocked') {
    previewNoticeOpen.value = true
    return
  }
  if (result === 'error') {
    err.value = S.cvHubPreviewError
  }
}

async function onChangeTemplate(cvId: string): Promise<void> {
  try {
    await patchProgress(cvId, { wizard_step: 'template', wizard_section: null })
    await navigateTo(ROUTES.cvEdit(cvId))
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Chyba'
  }
}

function openRename(c: CvListItemResponseDto): void {
  renameCvId.value = c.id
  renameTitle.value = c.display_title
  renameDialogOpen.value = true
}

async function saveRename(): Promise<void> {
  const id = renameCvId.value
  const title = renameTitle.value.trim()
  if (!id || !title) return
  renameSaving.value = true
  err.value = null
  try {
    await patchCv(id, { display_title: title })
    renameDialogOpen.value = false
    renameCvId.value = null
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Chyba'
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
  await deleteCv(id)
  await load()
}

onMounted(() => {
  if (!user.value) {
    return
  }
  void load()
})

useHead({
  title: () => S.cvHubTitle,
})
</script>
