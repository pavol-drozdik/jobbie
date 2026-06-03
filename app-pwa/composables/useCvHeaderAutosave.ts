import type { Ref } from 'vue'
import type { CvAggregateResponseDto, CvHeaderResponseDto } from '~/types/cv'
import type { CvSaveStatus } from '~/composables/useCv'
import { parseCvPatchValidationError, type CvValidationErrorItem } from '~/composables/useCvValidation'
import { sanitizeCvRichHtml } from '~/composables/useCvRichTextField'

export interface CvHeaderAutosaveCallbacks {
  onValidationError?: (payload: {
    summary: string
    items: CvValidationErrorItem[]
    byField: Record<string, string>
  }) => void
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
} {
  const { patchCv } = useCv()
  const saveStatus = ref<CvSaveStatus>('idle')
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let lastConfirmedHeader: CvHeaderResponseDto | null = null

  function cloneHeader(h: CvHeaderResponseDto): CvHeaderResponseDto {
    return JSON.parse(JSON.stringify(h)) as CvHeaderResponseDto
  }

  function fieldUnchangedSinceSend(current: unknown, baseline: unknown): boolean {
    if (Object.is(current, baseline)) return true
    return JSON.stringify(current ?? null) === JSON.stringify(baseline ?? null)
  }

  /**
   * Applies server PATCH result without clobbering fields the user edited while the request was in flight.
   */
  function mergeHeaderPatchResponse(
    current: CvHeaderResponseDto,
    updated: CvHeaderResponseDto,
    baselineAtSend: CvHeaderResponseDto,
  ): CvHeaderResponseDto {
    const out: CvHeaderResponseDto = { ...current }
    for (const key of Object.keys(updated) as Array<keyof CvHeaderResponseDto>) {
      if (fieldUnchangedSinceSend(current[key], baselineAtSend[key])) {
        ;(out as Record<string, unknown>)[key as string] = updated[key] as unknown
      }
    }
    return out
  }

  function syncBaseline(): void {
    const h = state.header.value
    lastConfirmedHeader = h ? cloneHeader(h) : null
  }

  function queueSave(): void {
    const id = cvId.value
    if (!state.header.value) return
    saveStatus.value = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      saveTimer = null
      const h = state.header.value
      if (!h) return
      try {
        const baselineAtSend = cloneHeader(h)
        const body: Record<string, unknown> = {
          display_title: h.display_title,
          template_key: h.template_key,
          visible_to_employers: h.visible_to_employers,
          optional_sections: h.optional_sections,
          first_name: h.first_name,
          last_name: h.last_name,
          gender: h.gender,
          show_academic_title: h.show_academic_title,
          title_before_name: h.title_before_name,
          title_after_name: h.title_after_name,
          birth_date: h.birth_date,
          show_birth_date: h.show_birth_date,
          email: h.email,
          phone: h.phone,
          linkedin_url: h.linkedin_url,
          show_contact_details: h.show_contact_details,
          address_country: h.address_country,
          address_city: h.address_city,
          address_street: h.address_street,
          address_postal_code: h.address_postal_code,
          address_district: h.address_district,
          about_me:
            h.about_me != null && String(h.about_me).trim() !== ''
              ? sanitizeCvRichHtml(String(h.about_me))
              : null,
          hobbies:
            h.hobbies != null && String(h.hobbies).trim() !== ''
              ? sanitizeCvRichHtml(String(h.hobbies))
              : null,
          additional_skills_info:
            h.additional_skills_info != null && String(h.additional_skills_info).trim() !== ''
              ? sanitizeCvRichHtml(String(h.additional_skills_info))
              : null,
          cv_title: h.cv_title,
          driving_license_categories: h.driving_license_categories,
          desired_positions: h.desired_positions,
          desired_locations: h.desired_locations,
          employment_types: h.employment_types,
          start_availability: h.start_availability,
          salary_min: h.salary_min,
          salary_currency: h.salary_currency,
          salary_period: h.salary_period,
          weekend_work: h.weekend_work,
          night_work: h.night_work,
          open_to_relocate_commute: h.open_to_relocate_commute,
          remote_work_only: h.remote_work_only,
          has_disability: h.has_disability,
          email_job_alerts: h.email_job_alerts,
          gdpr_consent: h.gdpr_consent,
          terms_consent: h.terms_consent,
          marketing_consent: h.marketing_consent,
        }
        const updated = await patchCv(id, body)
        const current = state.header.value
        const merged =
          current != null ? mergeHeaderPatchResponse(current, updated, baselineAtSend) : updated
        state.header.value = merged
        if (state.aggregate.value) {
          state.aggregate.value = { ...state.aggregate.value, cv: merged }
        }
        lastConfirmedHeader = cloneHeader(merged)
        saveStatus.value = 'saved'
        setTimeout(() => {
          if (saveStatus.value === 'saved') saveStatus.value = 'idle'
        }, 2000)
      } catch (err) {
        saveStatus.value = 'error'
        const parsed = parseCvPatchValidationError(err)
        state.callbacks?.onValidationError?.(parsed)
        if (lastConfirmedHeader && state.header.value && state.aggregate.value) {
          const restored = cloneHeader(lastConfirmedHeader)
          state.header.value = restored
          state.aggregate.value = { ...state.aggregate.value, cv: restored }
        }
      }
    }, 800)
  }

  return { saveStatus, queueSave, syncBaseline }
}
