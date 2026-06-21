import type { Ref } from 'vue'
import type { CvAggregateResponseDto, CvHeaderResponseDto } from '~/types/cv'
import type { CvSaveStatus } from '~/composables/useCv'
import { parseCvPatchValidationError, type CvValidationErrorItem } from '~/composables/useCvValidation'
import { sanitizeCvRichHtml } from '~/composables/useCvRichTextField'
import { fieldUnchangedSinceSend, mergePatchResponse } from '~/utils/merge-patch-response'

export interface CvHeaderAutosaveCallbacks {
  onValidationError?: (payload: {
    summary: string
    items: CvValidationErrorItem[]
    byField: Record<string, string>
  }) => void
}

const HEADER_PATCH_KEYS = [
  'display_title',
  'template_key',
  'visible_to_employers',
  'optional_sections',
  'first_name',
  'last_name',
  'gender',
  'show_academic_title',
  'title_before_name',
  'title_after_name',
  'birth_date',
  'show_birth_date',
  'email',
  'phone',
  'linkedin_url',
  'show_contact_details',
  'address_country',
  'address_city',
  'address_street',
  'address_postal_code',
  'address_district',
  'about_me',
  'hobbies',
  'additional_skills_info',
  'cv_title',
  'driving_license_categories',
  'desired_positions',
  'desired_locations',
  'employment_types',
  'start_availability',
  'salary_min',
  'salary_currency',
  'salary_period',
  'weekend_work',
  'night_work',
  'open_to_relocate_commute',
  'remote_work_only',
  'has_disability',
  'email_job_alerts',
  'gdpr_consent',
  'terms_consent',
  'marketing_consent',
] as const satisfies ReadonlyArray<keyof CvHeaderResponseDto>

type HeaderPatchKey = (typeof HEADER_PATCH_KEYS)[number]

function cloneHeader(h: CvHeaderResponseDto): CvHeaderResponseDto {
  return JSON.parse(JSON.stringify(h)) as CvHeaderResponseDto
}

function serializePatchValue(key: HeaderPatchKey, value: unknown): unknown {
  if (key === 'about_me' || key === 'hobbies' || key === 'additional_skills_info') {
    if (value == null || String(value).trim() === '') return null
    return sanitizeCvRichHtml(String(value))
  }
  return value
}

function buildHeaderPatchBody(
  current: CvHeaderResponseDto,
  baseline: CvHeaderResponseDto,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const key of HEADER_PATCH_KEYS) {
    const next = serializePatchValue(key, current[key])
    if (!fieldUnchangedSinceSend(next, serializePatchValue(key, baseline[key]))) {
      body[key] = next
    }
  }
  return body
}

export function useCvHeaderAutosave(
  cvId: Ref<string>,
  state: {
    header: Ref<CvHeaderResponseDto | null>
    aggregate: Ref<CvAggregateResponseDto | null>
    callbacks?: CvHeaderAutosaveCallbacks
  },
): {
  saveStatus: Ref<CvSaveStatus>
  queueSave: () => void
  syncBaseline: () => void
  flushSave: () => Promise<void>
} {
  const { patchCv } = useCv()
  const saveStatus = ref<CvSaveStatus>('idle')
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let saveInFlight: Promise<void> | null = null
  let dirtyWhileSaving = false
  let lastPersistedHeader: CvHeaderResponseDto | null = null

  function syncBaseline(): void {
    const h = state.header.value
    lastPersistedHeader = h ? cloneHeader(h) : null
  }

  async function persistHeader(): Promise<void> {
    const id = cvId.value
    const current = state.header.value
    if (!current) return

    const baseline = lastPersistedHeader ?? current
    const baselineAtSend = cloneHeader(current)
    const body = buildHeaderPatchBody(current, baseline)
    if (Object.keys(body).length === 0) return

    saveStatus.value = 'saving'
    try {
      const updated = await patchCv(id, body)
      const latest = state.header.value
      if (latest) {
        const merged = mergePatchResponse(latest, updated, baselineAtSend)
        state.header.value = merged
        lastPersistedHeader = cloneHeader(merged)
        if (state.aggregate.value) {
          const cvPatch: Partial<CvHeaderResponseDto> = {}
          for (const key of Object.keys(body)) {
            const k = key as keyof CvHeaderResponseDto
            cvPatch[k] = merged[k] as never
          }
          state.aggregate.value = {
            ...state.aggregate.value,
            cv: { ...state.aggregate.value.cv, ...cvPatch },
          }
        }
      }
      saveStatus.value = 'saved'
      setTimeout(() => {
        if (saveStatus.value === 'saved') saveStatus.value = 'idle'
      }, 2000)
    } catch (err) {
      saveStatus.value = 'error'
      const parsed = parseCvPatchValidationError(err)
      state.callbacks?.onValidationError?.(parsed)
    }
  }

  async function runSave(): Promise<void> {
    if (saveInFlight) {
      dirtyWhileSaving = true
      await saveInFlight
      if (!dirtyWhileSaving) return
      dirtyWhileSaving = false
    }

    const task = persistHeader()
    saveInFlight = task
    try {
      await task
    } finally {
      saveInFlight = null
      if (dirtyWhileSaving) {
        dirtyWhileSaving = false
        await runSave()
      }
    }
  }

  function queueSave(): void {
    if (!state.header.value) return
    if (saveInFlight) {
      dirtyWhileSaving = true
      return
    }
    saveStatus.value = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      void runSave()
    }, 600)
  }

  async function flushSave(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    await runSave()
  }

  return { saveStatus, queueSave, syncBaseline, flushSave }
}
