<template>
  <div class="mx-auto box-border w-full max-w-[1400px] pb-6 pt-3 font-dmSans text-black">
    <div class="px-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <AppBackLink :to="ROUTES.cvHub" label="Späť" />
        <CvAutosaveStatus v-if="aggregate && header" :status="saveStatus" />
      </div>
      <div v-if="loadError" class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {{ loadError }}
      </div>
      <div v-if="patchErrorSummary" class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
        <p class="m-0 text-[15px] font-bold">
          {{ patchErrorSummary }}
        </p>
        <ul v-if="patchErrorItems.length" class="mt-2 mb-0 list-disc pl-5 text-[14px]">
          <li v-for="(it, i) in patchErrorItems" :key="i">
            <span class="font-semibold">{{ it.field }}</span>: {{ it.message }}
          </li>
        </ul>
      </div>
    </div>
    <div v-if="aggregate && header">
      <CvPrototypeShell
        :cv-id="cvId"
        :parent-step="step"
        :header="header"
        :aggregate="aggregate"
        :update-header="onHeaderPartial"
        :update-aggregate="onUpdateAggregate"
        :queue-save="queueSave"
        :flush-header-save="flushSave"
        :finish-wizard="onFinish"
        :register-section-save-flusher="registerSectionSaveFlusher"
        @reload="onReload"
        @go-step="onGoStep"
        @set-section="onSetSection"
      />
    </div>
    <div v-else-if="!loadError" class="px-5 py-12 text-center text-black/40">
      Načítavam…
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import type { CvAggregateResponseDto, CvHeaderResponseDto } from '~/types/cv'
import type { CvValidationErrorItem } from '~/composables/useCvValidation'

const props = defineProps<{
  cvId: string
}>()

const cvIdRef = toRef(props, 'cvId')
const { patchProgress, getCvAggregate } = useCv()

const step = ref(0)
const aggregate = ref<CvAggregateResponseDto | null>(null)
const header = ref<CvHeaderResponseDto | null>(null)
const loadError = ref<string | null>(null)
const patchErrorSummary = ref<string | null>(null)
const patchErrorItems = ref<CvValidationErrorItem[]>([])

const { saveStatus, queueSave, syncBaseline, flushSave } = useCvHeaderAutosave(cvIdRef, {
  header,
  aggregate,
  callbacks: {
    onValidationError(p) {
      patchErrorSummary.value = p.summary
      patchErrorItems.value = p.items
    },
  },
})

watch(saveStatus, (s) => {
  if (s === 'saved') {
    patchErrorSummary.value = null
    patchErrorItems.value = []
  }
})

const subsectionKeys = ['personal', 'photo', 'work', 'education', 'skills', 'languages', 'extra'] as const
type WizardSubsectionKey = (typeof subsectionKeys)[number]

async function refresh(): Promise<void> {
  loadError.value = null
  try {
    aggregate.value = await getCvAggregate(props.cvId)
    header.value = { ...aggregate.value.cv }
    syncBaseline()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Chyba načítania'
  }
}

function onUpdateAggregate(updater: (agg: CvAggregateResponseDto) => CvAggregateResponseDto): void {
  if (!aggregate.value) return
  aggregate.value = updater(aggregate.value)
}

async function onReload(): Promise<void> {
  if (!(await persistPendingEdits())) return
  await refresh()
}

const flushSectionSavesRef = ref<(() => Promise<void>) | null>(null)

function registerSectionSaveFlusher(fn: () => Promise<void>): void {
  flushSectionSavesRef.value = fn
}

function onHeaderPartial(partial: Partial<CvHeaderResponseDto>): void {
  if (!header.value) return
  header.value = { ...header.value, ...partial }
  queueSave()
}

async function persistPendingEdits(): Promise<boolean> {
  const headerOk = await flushSave()
  if (!headerOk) {
    if (!patchErrorSummary.value) {
      patchErrorSummary.value = 'Nepodarilo sa uložiť životopis. Opravte chyby a skúste znova.'
    }
    return false
  }
  try {
    await flushSectionSavesRef.value?.()
    return true
  } catch {
    patchErrorSummary.value = 'Nepodarilo sa uložiť časť životopisu. Skúste to znova.'
    return false
  }
}

async function onGoStep(target: number): Promise<void> {
  if (!(await persistPendingEdits())) return
  const s = Math.max(0, Math.min(2, target))
  try {
    const updated = await patchProgress(
      props.cvId,
      s === 0
        ? { wizard_step: 'template', wizard_section: null }
        : s === 1
          ? { wizard_step: 'editor', wizard_section: 'personal' }
          : { wizard_step: 'final', wizard_section: null },
    )
    if (header.value) {
      header.value = {
        ...header.value,
        wizard_step: updated.wizard_step,
        wizard_section: updated.wizard_section,
      }
    }
    if (aggregate.value) {
      aggregate.value = {
        ...aggregate.value,
        cv: {
          ...aggregate.value.cv,
          wizard_step: updated.wizard_step,
          wizard_section: updated.wizard_section,
        },
      }
    }
  } catch (e) {
    patchErrorSummary.value = e instanceof Error ? e.message : 'Nepodarilo sa uložiť krok sprievodcu.'
    return
  }
  step.value = s
}

async function onFinish(): Promise<void> {
  if (!(await persistPendingEdits())) return
  try {
    const updated = await patchProgress(props.cvId, {
      wizard_step: 'final',
      wizard_section: null,
    })
    if (header.value) {
      header.value = {
        ...header.value,
        wizard_step: updated.wizard_step,
        wizard_section: updated.wizard_section,
      }
    }
    if (aggregate.value) {
      aggregate.value = {
        ...aggregate.value,
        cv: {
          ...aggregate.value.cv,
          wizard_step: updated.wizard_step,
          wizard_section: updated.wizard_section,
        },
      }
    }
    syncBaseline()
  } catch (e) {
    patchErrorSummary.value = e instanceof Error ? e.message : 'Nepodarilo sa dokončiť životopis.'
    return
  }
  await refresh()
  await navigateTo(ROUTES.cvHub)
}

async function onSetSection(section: string): Promise<void> {
  if (!(await persistPendingEdits())) return
  const key = section === 'personal' ? 'personal'
    : section === 'experience' ? 'work'
    : section === 'education' ? 'education'
    : section === 'skills' ? 'skills'
    : section === 'languages' ? 'languages'
    : section === 'extras' ? 'extra'
    : 'personal'
  if (subsectionKeys.includes(key as WizardSubsectionKey)) {
    await patchProgress(props.cvId, { wizard_step: 'editor', wizard_section: key })
  }
}

onMounted(async () => {
  await refresh()
  if (!aggregate.value) return
  const cv = aggregate.value.cv
  if (cv.wizard_step === 'template') {
    step.value = 0
    return
  }
  // Open on the data editor (not final settings) so saved fields are visible.
  step.value = 1
})

onBeforeUnmount(() => {
  void flushSave()
  void flushSectionSavesRef.value?.()
})

onBeforeRouteLeave(async () => {
  if (!(await persistPendingEdits())) {
    return false
  }
})
</script>
