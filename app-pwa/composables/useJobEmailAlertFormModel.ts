import { reactive } from 'vue'
import { S } from '~/utils/strings'
import { EMPLOYMENT_TYPES_FOR_JOB_ALERT } from '~/utils/employment-types'
import { CATEGORIES, getCategoryLabel, getJobTypeLabel } from '~/utils/job'
import type { JobEmailAlertCreateBody, JobEmailAlertDto } from '~/composables/useJobEmailAlerts'

export type JobEmailAlertFormState = {
  name: string
  keywords: string
  location: string
  radiusSel: string
  employment_types: string[]
  work_modes: string[]
  category: string
  salary_min: number | null
  benefits: number[]
  frequency: 'daily' | 'weekly' | 'monthly'
}

export const JOB_ALERT_EMPLOYMENT_OPTIONS = EMPLOYMENT_TYPES_FOR_JOB_ALERT.map((o) => ({
  v: o.value,
  label: o.label,
}))

export const JOB_ALERT_WORK_MODE_OPTIONS = [
  { v: 'on_site', label: 'Na pracovisku' },
  { v: 'hybrid', label: 'Hybrid' },
  { v: 'remote', label: 'Remote' },
] as const

export const JOB_ALERT_LOCATION_PRESETS = [
  'Bratislava',
  'Košice',
  'Žilina',
  'Prešov',
  'Banská Bystrica',
  'Trnava',
  'Nitra',
] as const

export function emptyJobEmailAlertForm(): JobEmailAlertFormState {
  return {
    name: '',
    keywords: '',
    location: '',
    radiusSel: '',
    employment_types: [],
    work_modes: [],
    category: 'all',
    salary_min: null,
    benefits: [],
    frequency: 'daily',
  }
}

export function radiusKmFromSel(sel: string): number | null {
  if (sel === '' || sel === 'all') {
    return null
  }
  const n = Number(sel)
  return Number.isFinite(n) ? n : null
}

// Digest needs at least one filter; geo criterion requires both city and radius (not location alone).
export function hasAtLeastOneAlertCriterion(form: JobEmailAlertFormState): boolean {
  if (form.keywords.trim()) {
    return true
  }
  const loc = form.location.trim()
  if (loc && radiusKmFromSel(form.radiusSel) !== null) {
    return true
  }
  if (form.employment_types.length > 0) {
    return true
  }
  if (form.work_modes.length > 0) {
    return true
  }
  const cat = form.category.trim()
  if (cat && cat !== 'all') {
    return true
  }
  if (form.salary_min != null && form.salary_min > 0) {
    return true
  }
  if (form.benefits.length > 0) {
    return true
  }
  return false
}

export function jobEmailAlertFormToDto(form: JobEmailAlertFormState): JobEmailAlertCreateBody {
  const radius_km = radiusKmFromSel(form.radiusSel)
  const category =
    form.category === 'all' || !form.category.trim() ? null : form.category.trim()
  return {
    name: form.name.trim(),
    keywords: form.keywords.trim() || undefined,
    location: form.location.trim() || undefined,
    radius_km,
    category,
    categories: category ? [category] : [],
    employment_types: form.employment_types,
    work_modes: form.work_modes,
    salary_type: form.salary_min != null && form.salary_min > 0 ? 'monthly' : null,
    salary_min:
      form.salary_min != null && form.salary_min > 0 ? form.salary_min : null,
    frequency: form.frequency,
    work_mode: form.work_modes.length === 1 ? form.work_modes[0]! : null,
    benefits: [...form.benefits],
  }
}

export function dtoToJobEmailAlertForm(a: JobEmailAlertDto, form: JobEmailAlertFormState): void {
  form.name = a.name
  form.keywords = a.keywords ?? ''
  form.location = a.location ?? ''
  form.radiusSel =
    a.radius_km === null || a.radius_km === undefined ? '' : String(a.radius_km)
  form.employment_types = [...(a.employment_types ?? [])]
  form.work_modes = [...(a.work_modes ?? [])]
  form.category = a.category?.trim() || (a.categories?.[0] ?? 'all')
  if (form.category && !(CATEGORIES as readonly string[]).includes(form.category)) {
    form.category = 'all'
  }
  form.salary_min =
    a.salary_min !== null && a.salary_min !== undefined ? Number(a.salary_min) : null
  form.benefits = [...(a.benefits ?? [])]
  form.frequency =
    a.frequency === 'weekly'
      ? 'weekly'
      : a.frequency === 'monthly'
        ? 'monthly'
        : 'daily'
}

function jobAlertFrequencyMetaLabel(frequency: string): string {
  if (frequency === 'weekly') {
    return S.jobEmailAlertsMetaWeekly
  }
  if (frequency === 'monthly') {
    return S.jobEmailAlertsMetaMonthly
  }
  return S.jobEmailAlertsMetaDaily
}

export function applyJobAlertPrefillFromQuery(
  query: Record<string, string | string[] | undefined>,
  form: JobEmailAlertFormState,
): boolean {
  const g = (k: string) => (typeof query[k] === 'string' ? (query[k] as string) : '')
  const gList = (k: string) =>
    typeof query[k] === 'string'
      ? (query[k] as string).split(',').map((s) => s.trim()).filter(Boolean)
      : []
  let hasPrefill = false
  if (g('q')) {
    form.keywords = g('q')
    hasPrefill = true
  }
  if (g('location')) {
    form.location = g('location')
    hasPrefill = true
  }
  const rad = g('radius')
  if (rad === '' || rad === 'null') {
    form.radiusSel = ''
  } else if (['0', '10', '25', '50', '100'].includes(rad)) {
    form.radiusSel = rad
    hasPrefill = true
  }
  const jt = [...new Set([...gList('job_type'), ...gList('jobTypes')])]
  if (jt.length) {
    form.employment_types = jt.filter((j) =>
      JOB_ALERT_EMPLOYMENT_OPTIONS.some((e) => e.v === j),
    )
    hasPrefill = true
  }
  const wm = [...new Set([...gList('work_mode'), ...gList('workModes')])]
  if (wm.length) {
    form.work_modes = wm.filter((w) =>
      JOB_ALERT_WORK_MODE_OPTIONS.some((x) => x.v === w),
    )
    hasPrefill = true
  }
  const cat = g('category')
  if (cat && (CATEGORIES as readonly string[]).includes(cat)) {
    form.category = cat
    hasPrefill = true
  }
  const sm = g('salaryMin')
  if (sm) {
    const n = Number(sm)
    if (Number.isFinite(n) && n > 0) {
      form.salary_min = n
      hasPrefill = true
    }
  }
  return hasPrefill
}

export function formatAlertMetaFromForm(form: JobEmailAlertFormState): string {
  const parts: string[] = []
  parts.push(jobAlertFrequencyMetaLabel(form.frequency))
  const loc = form.location.trim()
  const r = radiusKmFromSel(form.radiusSel)
  if (loc && r !== null) {
    const rad =
      r === 0
        ? S.jobEmailAlertsMetaRadiusExact
        : S.jobEmailAlertsMetaRadiusKm.replace('{km}', String(r))
    parts.push(`${loc} ${rad}`)
  } else if (loc) {
    parts.push(loc)
  }
  if (form.keywords.trim()) {
    parts.push(form.keywords.trim())
  }
  if (form.employment_types.length) {
    parts.push(
      form.employment_types.map((j) => getJobTypeLabel(j) || j).join(', '),
    )
  }
  if (form.work_modes.length) {
    parts.push(
      form.work_modes
        .map((w) => JOB_ALERT_WORK_MODE_OPTIONS.find((o) => o.v === w)?.label ?? w)
        .join(', '),
    )
  }
  const cat = form.category.trim()
  if (cat && cat !== 'all') {
    parts.push(getCategoryLabel(cat))
  }
  if (form.salary_min != null && form.salary_min > 0) {
    parts.push(
      S.jobEmailAlertsMetaSalaryFrom.replace(
        '{amount}',
        Number(form.salary_min).toLocaleString('sk-SK'),
      ),
    )
  }
  if (form.benefits.length > 0) {
    parts.push(
      S.jobAlertsSummaryBenefits.replace('{count}', String(form.benefits.length)),
    )
  }
  return parts.join(' · ')
}

export function formatAlertMeta(a: JobEmailAlertDto): string {
  const parts: string[] = []
  parts.push(jobAlertFrequencyMetaLabel(a.frequency))
  parts.push(a.is_active ? S.jobEmailAlertsMetaActive : S.jobEmailAlertsMetaPaused)
  const loc = (a.location ?? '').trim()
  const r = a.radius_km
  if (loc && r !== null && r !== undefined) {
    const rad =
      r === 0
        ? S.jobEmailAlertsMetaRadiusExact
        : S.jobEmailAlertsMetaRadiusKm.replace('{km}', String(r))
    parts.push(`${loc} ${rad}`)
  } else if (loc) {
    parts.push(loc)
  }
  if ((a.keywords ?? '').trim()) {
    parts.push((a.keywords ?? '').trim())
  }
  const jt = (a.employment_types ?? []).filter(Boolean)
  if (jt.length) {
    parts.push(jt.map((j) => getJobTypeLabel(j) || j).join(', '))
  }
  if (a.salary_min != null && Number(a.salary_min) > 0) {
    parts.push(
      S.jobEmailAlertsMetaSalaryFrom.replace(
        '{amount}',
        Number(a.salary_min).toLocaleString('sk-SK'),
      ),
    )
  }
  const benefitIds = (a.benefits ?? []).filter((id) => Number.isFinite(id))
  if (benefitIds.length > 0) {
    parts.push(
      S.jobAlertsSummaryBenefits.replace('{count}', String(benefitIds.length)),
    )
  }
  return parts.join(' · ')
}

export function formatSkDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatAlertDateLine(a: JobEmailAlertDto): string {
  if (!a.last_dispatch_at) {
    return ''
  }
  return `${S.jobEmailAlertsLastSentPrefix} ${formatSkDateTime(a.last_dispatch_at)}`
}

export function useJobEmailAlertFormModel(initial?: Partial<JobEmailAlertFormState>) {
  const form = reactive<JobEmailAlertFormState>({
    ...emptyJobEmailAlertForm(),
    ...initial,
  })

  function resetForm(): void {
    Object.assign(form, emptyJobEmailAlertForm())
  }

  function toggleEmployment(value: string): void {
    const i = form.employment_types.indexOf(value)
    if (i >= 0) {
      form.employment_types.splice(i, 1)
    } else {
      form.employment_types.push(value)
    }
  }

  function toggleWorkMode(value: string): void {
    const i = form.work_modes.indexOf(value)
    if (i >= 0) {
      form.work_modes.splice(i, 1)
    } else {
      form.work_modes.push(value)
    }
  }

  return {
    form,
    resetForm,
    toggleEmployment,
    toggleWorkMode,
    buildBody: () => jobEmailAlertFormToDto(form),
    validateStep0: () => {
      if (!form.name.trim()) {
        return S.jobEmailAlertsWizardErrName
      }
      return null
    },
    validateStep1: () => {
      if (!hasAtLeastOneAlertCriterion(form)) {
        return S.jobEmailAlertsWizardErrCriteria
      }
      return null
    },
    summaryLine: () => formatAlertMetaFromForm(form),
  }
}
