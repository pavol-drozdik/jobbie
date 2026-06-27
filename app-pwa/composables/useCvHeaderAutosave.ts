import type { Ref } from 'vue'
import type { CvAggregateResponseDto, CvHeaderResponseDto } from '~/types/cv'
import type { CvSaveStatus } from '~/composables/useCv'
import { parseCvPatchValidationError, type CvValidationErrorItem } from '~/composables/useCvValidation'
import { sanitizeCvRichHtml } from '~/composables/useCvRichTextField'
import { fieldUnchangedSinceSend } from '~/utils/merge-patch-response'

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

function isHeaderPatchKey(key: string): key is HeaderPatchKey {
  return (HEADER_PATCH_KEYS as readonly string[]).includes(key)
}

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

export function buildCvHeaderPatchBody(
  current: CvHeaderResponseDto,
  baseline: CvHeaderResponseDto | null,
): Record<string, unknown> {
  const base = baseline ?? ({} as CvHeaderResponseDto)
  const body: Record<string, unknown> = {}
  for (const key of HEADER_PATCH_KEYS) {
    const next = serializePatchValue(key, current[key])
    const prev = serializePatchValue(key, base[key])
    if (!fieldUnchangedSinceSend(next, prev)) {
      body[key] = next
    }
  }
  return body
}

/** Sends every header field — used on explicit flush (finish, blur, navigation). */
export function buildCvHeaderFullPatchBody(current: CvHeaderResponseDto): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const key of HEADER_PATCH_KEYS) {
    body[key] = serializePatchValue(key, current[key])
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
  flushSave: () => Promise<boolean>
} {
  const { patchCv } = useCv()
  const saveStatus = ref<CvSaveStatus>('idle')
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let lastPersistedHeader: CvHeaderResponseDto | null = null
  let persistChain: Promise<boolean> = Promise.resolve(true)

  function syncBaseline(): void {
    const h = state.header.value
    lastPersistedHeader = h ? cloneHeader(h) : null
  }

  function serverConfirmedField(key: HeaderPatchKey, sentVal: unknown, srvVal: unknown): boolean {
    const sent = serializePatchValue(key, sentVal)
    const srv = serializePatchValue(key, srvVal)
    return fieldUnchangedSinceSend(srv, sent)
  }

const SKIP_SERVER_CONFIRM_KEYS = new Set<HeaderPatchKey>(['optional_sections'])

  /** Returns true only when every field we sent is echoed back by the server. Never overwrites local edits. */
  function confirmServerSave(
    updated: CvHeaderResponseDto,
    baselineAtSend: CvHeaderResponseDto,
    body: Record<string, unknown>,
  ): boolean {
    const latest = state.header.value
    if (!latest) return true

    for (const key of Object.keys(body)) {
      if (!isHeaderPatchKey(key)) continue
      if (SKIP_SERVER_CONFIRM_KEYS.has(key)) continue
      const k = key as keyof CvHeaderResponseDto
      if (!fieldUnchangedSinceSend(latest[k], baselineAtSend[k])) continue
      if (!serverConfirmedField(key, body[key], updated[k])) return false
    }
    return true
  }

  function applySuccessfulSave(
    updated: CvHeaderResponseDto,
    baselineAtSend: CvHeaderResponseDto,
    body: Record<string, unknown>,
  ): void {
    const latest = state.header.value
    if (latest) {
      const merged = { ...latest }
      for (const key of Object.keys(body)) {
        if (!isHeaderPatchKey(key)) continue
        const k = key as keyof CvHeaderResponseDto
        if (fieldUnchangedSinceSend(latest[k], baselineAtSend[k])) {
          merged[k] = updated[k] as never
        }
      }
      state.header.value = merged
    }
    lastPersistedHeader = cloneHeader(updated)
    if (state.aggregate.value) {
      state.aggregate.value = {
        ...state.aggregate.value,
        cv: { ...state.aggregate.value.cv, ...updated },
      }
    }
  }

  async function persistOnce(forceFull = false): Promise<boolean> {
    const id = cvId.value.trim()
    const current = state.header.value
    if (!id || !current) return true

    const body = forceFull
      ? buildCvHeaderFullPatchBody(current)
      : buildCvHeaderPatchBody(current, lastPersistedHeader)
    if (Object.keys(body).length === 0) {
      saveStatus.value = 'idle'
      return true
    }

    const baselineAtSend = cloneHeader(current)
    saveStatus.value = 'saving'
    try {
      const updated = await patchCv(id, body)
      if (!confirmServerSave(updated, baselineAtSend, body)) {
        saveStatus.value = 'error'
        state.callbacks?.onValidationError?.({
          summary: 'Údaje sa nepodarilo uložiť na server. Skontrolujte pripojenie a skúste znova.',
          items: [],
          byField: {},
        })
        return false
      }
      applySuccessfulSave(updated, baselineAtSend, body)
      saveStatus.value = 'saved'
      setTimeout(() => {
        if (saveStatus.value === 'saved') saveStatus.value = 'idle'
      }, 2000)
      return true
    } catch (err) {
      saveStatus.value = 'error'
      const parsed = parseCvPatchValidationError(err)
      state.callbacks?.onValidationError?.(parsed)
      return false
    }
  }

  async function persistUntilClean(forceFull = false): Promise<boolean> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const ok = await persistOnce(forceFull && attempt === 0)
      if (!ok) return false
      if (Object.keys(buildCvHeaderPatchBody(state.header.value!, lastPersistedHeader)).length === 0) {
        return true
      }
    }
    return Object.keys(buildCvHeaderPatchBody(state.header.value!, lastPersistedHeader)).length === 0
  }

  function queueSave(): void {
    if (!state.header.value) return
    saveStatus.value = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      void flushSave()
    }, 150)
  }

  async function flushSave(): Promise<boolean> {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    // Use delta diff so that if nothing changed since the last save the PATCH is skipped entirely.
    // persistOnce short-circuits when buildCvHeaderPatchBody returns {} (lines 189-191).
    const run = persistChain.then(() => persistUntilClean(false))
    persistChain = run.then(
      (ok) => ok,
      () => false,
    )
    return run
  }

  return { saveStatus, queueSave, syncBaseline, flushSave }
}
