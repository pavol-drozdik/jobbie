import type { Job } from '~/utils/job'
import { getJobCardWorkModeLabel, getJobPublicLocation } from '~/utils/job'
import { S } from '~/utils/strings'
import { employmentTypeLabel } from '~/utils/employment-types'
import {
  benefitLabel,
  driverLicenseLabel,
  educationLevelLabel,
  languageLabel,
  languageLevelLabel,
  workShiftModeLabel,
} from '~/utils/job-alert-options'
import {
  APPLICATION_METHOD_OPTIONS,
  employmentUsesStandardNastup,
  JOB_POST_REQUIRED_DOCUMENT_OPTIONS,
} from '~/utils/job-post-options'

export type JobDetailLabelValue = { label: string; value: string }

export type JobRequirementsMeta = {
  v?: number
  job_kind?: 'brigada' | 'tpp' | 'fuska'
  brigada?: {
    nastup?: string | null
    asap?: boolean
    od?: string | null
    do?: string | null
  }
  tpp?: {
    nastup?: string | null
    asap?: boolean
    obdobie?: 'urcite' | 'neurcite'
    od?: string | null
    do?: string | null
  }
  fuska?: {
    nezalezi?: boolean
    od?: string | null
    do?: string | null
  }
  turnus?: {
    od?: string | null
    do?: string | null
  }
}

function formatDateSkShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const raw = String(iso).trim()
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00.000Z` : raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function formatDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  const a = formatDateSkShort(from)
  const b = formatDateSkShort(to)
  if (a && b) return `${a} – ${b}`
  if (a) return a
  if (b) return b
  return ''
}

function primaryEmploymentType(job: Job): string {
  const emp = (job.employment_types ?? []).find((e) => String(e).trim())
  if (emp) return String(emp).trim()
  if (job.job_type === 'fuska') return 'one_off'
  if (job.job_type === 'brigada') return 'brigada'
  return 'full_time'
}

function nastupDisplay(
  asap: boolean,
  nastup: string | null | undefined,
  job: Job,
): string {
  if (asap || job.start_type === 'asap') return S.jobAlertsStartAsap
  const date = nastup || job.start_date
  const formatted = formatDateSkShort(date)
  if (formatted) return formatted
  if (job.start_type === 'by_agreement') return S.jobAlertsStartByAgreement
  return ''
}

function asRecordArray<T extends Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function parseJobRequirementsMeta(
  requirements: unknown,
): JobRequirementsMeta | null {
  if (requirements == null) return null
  if (typeof requirements === 'object' && !Array.isArray(requirements)) {
    return requirements as JobRequirementsMeta
  }
  if (typeof requirements !== 'string') return null
  const raw = requirements.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as JobRequirementsMeta
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function buildJobScheduleItems(job: Job): JobDetailLabelValue[] {
  const items: JobDetailLabelValue[] = []
  const req = parseJobRequirementsMeta(job.requirements)
  const employment = primaryEmploymentType(job)
  const jobKind = req?.job_kind ?? job.job_type ?? 'brigada'

  if (employmentUsesStandardNastup(employment)) {
    let asap = false
    let nastup: string | null | undefined
    if (jobKind === 'brigada' && req?.brigada) {
      asap = Boolean(req.brigada.asap)
      nastup = req.brigada.nastup
    } else if (jobKind === 'tpp' && req?.tpp && employment !== 'turnus') {
      asap = Boolean(req.tpp.asap)
      nastup = req.tpp.nastup
    }
    const value = nastupDisplay(asap, nastup, job)
    if (value) {
      items.push({ label: S.jobDetailScheduleNastup, value })
    }
  }

  if (employment === 'brigada' && req?.brigada) {
    const range = formatDateRange(req.brigada.od, req.brigada.do)
    if (range) {
      items.push({ label: S.jobDetailScheduleBrigadaPeriod, value: range })
    }
  }

  if (employment === 'turnus' && req?.turnus) {
    const range = formatDateRange(req.turnus.od, req.turnus.do)
    if (range) {
      items.push({ label: S.jobDetailScheduleTurnusPeriod, value: range })
    }
  }

  if (jobKind === 'tpp' && employment !== 'turnus' && req?.tpp) {
    if (req.tpp.obdobie === 'neurcite') {
      items.push({
        label: S.jobDetailScheduleTppPeriod,
        value: S.jobDetailScheduleTppIndefinite,
      })
    } else {
      const range = formatDateRange(req.tpp.od, req.tpp.do)
      if (range) {
        items.push({ label: S.jobDetailScheduleTppPeriod, value: range })
      }
    }
  }

  if (jobKind === 'fuska' || employment === 'one_off') {
    if (req?.fuska?.nezalezi) {
      items.push({
        label: S.jobDetailScheduleFuskaPeriod,
        value: S.jobDetailScheduleFuskaAnytime,
      })
    } else if (req?.fuska) {
      const range = formatDateRange(req.fuska.od, req.fuska.do)
      if (range) {
        items.push({ label: S.jobDetailScheduleFuskaPeriod, value: range })
      }
    } else if (job.start_type === 'by_agreement') {
      items.push({
        label: S.jobDetailScheduleFuskaPeriod,
        value: S.jobAlertsStartByAgreement,
      })
    } else if (job.start_date) {
      const formatted = formatDateSkShort(job.start_date)
      if (formatted) {
        items.push({ label: S.jobDetailScheduleFuskaPeriod, value: formatted })
      }
    }
  }

  const applyBy = formatDateSkShort(job.application_deadline)
  if (applyBy) {
    items.push({ label: S.jobDetailScheduleApplyBy, value: applyBy })
  }

  return items
}

export function buildJobLocationDetail(job: Job): {
  lines: JobDetailLabelValue[]
  isForeign: boolean
} {
  const lines: JobDetailLabelValue[] = []
  const location = getJobPublicLocation(job).trim()
  if (location && location !== '—') {
    lines.push({ label: S.jobDetailLocationArea, value: location })
  }
  const postal = (job.postal_code ?? '').trim()
  if (postal) {
    lines.push({ label: S.jobDetailLocationPostal, value: postal })
  }
  const workMode = getJobCardWorkModeLabel(job)
  if (workMode) {
    lines.push({ label: S.jobDetailLocationWorkMode, value: workMode })
  }
  return { lines, isForeign: Boolean(job.is_foreign) }
}

export function buildJobRequirementsDetail(job: Job): {
  education: string | null
  languages: string[]
  skills: string[]
  driverLicenses: string[]
  workShifts: string[]
} {
  const educationIds = asRecordArray<unknown>(job.education_levels)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
  const education =
    educationIds.length > 0
      ? educationLevelLabel(educationIds[0]!)
      : null

  const languages = asRecordArray<{ language_id: number; level: string }>(
    job.languages,
  )
    .map((row) => {
      const name = languageLabel(row.language_id)
      const level = languageLevelLabel(String(row.level ?? ''))
      return level ? `${name} (${level})` : name
    })
    .filter(Boolean)

  const skills = asRecordArray<unknown>(job.skill_tags)
    .map((t) => String(t).trim())
    .filter(Boolean)

  const driverLicenses = asRecordArray<unknown>(job.driver_licenses)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
    .map((id) => driverLicenseLabel(id))

  const workShifts = asRecordArray<unknown>(job.work_shift_modes)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
    .map((id) => workShiftModeLabel(id))

  return { education, languages, skills, driverLicenses, workShifts }
}

export function buildJobBenefitLabels(job: Job): string[] {
  return asRecordArray<unknown>(job.benefits)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
    .map((id) => benefitLabel(id))
}

export function buildJobApplicationDetail(job: Job): {
  method: string | null
  contactPerson: string | null
  requiredDocuments: string[]
} {
  const methodValue = (job.application_method ?? 'platform').trim()
  const method =
    APPLICATION_METHOD_OPTIONS.find((o) => o.value === methodValue)?.label ??
    methodValue

  const contactPerson = (job.contact_person ?? '').trim() || null

  const docLabels = new Map(
    JOB_POST_REQUIRED_DOCUMENT_OPTIONS.map((o) => [o.value, o.label]),
  )
  const requiredDocuments = asRecordArray<string>(job.required_documents)
    .filter((d) => d !== 'none')
    .map((d) => docLabels.get(d) ?? d)
    .filter(Boolean)

  return { method, contactPerson, requiredDocuments }
}

export function hasJobRequirementsDetail(
  detail: ReturnType<typeof buildJobRequirementsDetail>,
): boolean {
  return (
    Boolean(detail.education) ||
    detail.languages.length > 0 ||
    detail.skills.length > 0 ||
    detail.driverLicenses.length > 0 ||
    detail.workShifts.length > 0
  )
}

export function employmentTypePills(job: Job): string[] {
  const types = asRecordArray<string>(job.employment_types).filter((e) =>
    String(e).trim(),
  )
  if (types.length > 0) {
    return types.map((e) => employmentTypeLabel(e) || e)
  }
  return []
}

export function firstScheduleMetaPill(job: Job): string {
  const items = buildJobScheduleItems(job)
  return items[0]?.value ?? ''
}
