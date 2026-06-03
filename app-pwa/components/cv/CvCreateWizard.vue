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
        @patch-header="onHeaderPartial"
        @reload="refresh"
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

const { saveStatus, queueSave, syncBaseline } = useCvHeaderAutosave(cvIdRef, {
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

function onHeaderPartial(partial: Partial<CvHeaderResponseDto>): void {
  if (!header.value) return
  header.value = { ...header.value, ...partial }
  if (aggregate.value) {
    aggregate.value = { ...aggregate.value, cv: { ...header.value } }
  }
  queueSave()
}

async function onGoStep(target: number): Promise<void> {
  const s = Math.max(0, Math.min(2, target))
  if (s === 0) {
    await patchProgress(props.cvId, { wizard_step: 'template', wizard_section: null })
  } else if (s === 1) {
    await patchProgress(props.cvId, { wizard_step: 'editor', wizard_section: 'personal' })
  } else {
    await patchProgress(props.cvId, { wizard_step: 'final', wizard_section: null })
  }
  await refresh()
  step.value = s
}

async function onSetSection(section: string): Promise<void> {
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
  if (cv.wizard_step === 'final') {
    step.value = 2
    return
  }
  if (cv.wizard_step === 'editor') {
    step.value = 1
    return
  }
  step.value = 0
})
</script>
