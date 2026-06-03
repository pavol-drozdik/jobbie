import {
  EMPLOYMENT_TYPES_FOR_FIND_FILTER,
  EMPLOYMENT_TYPES_FOR_FIND_FILTER_FOREIGN,
  employmentTypeLabel,
} from '~/utils/employment-types'
import { BRAND_DEFAULT_THUMB_SVG_PATH } from './brand-assets'

export type Job = {
  id: string
  company_id: string
  title: string
  description: string
  location: string | null
  location_address: string | null
  location_lat: number | null
  location_lng: number | null
  contract_type: string | null
  /** JSON string from API writes; Supabase may return a parsed object on read. */
  requirements: string | Record<string, unknown> | null
  salary: string | null
  job_type: string | null
  work_mode?: string | null
  work_modes?: string[]
  employment_types?: string[]
  city?: string | null
  postal_code?: string | null
  show_exact_address?: boolean
  expires_at: string | null
  is_draft: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  category: string | null
  is_urgent: boolean
  is_featured: boolean
  show_top_badge?: boolean
  compensation_type: string | null
  compensation_amount: number | null
  workers_needed: number
  application_deadline: string | null
  completion_deadline: string | null
  employer_email: string | null
  employer_name: string | null
  photos: string[]
  applications_count: number
  work_from_home?: boolean
  salary_type?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_negotiable?: boolean
  education_levels?: number[]
  benefits?: number[]
  suitable_for?: number[]
  driver_licenses?: number[]
  work_shift_modes?: number[]
  languages?: Array<{ language_id: number; level: string }>
  pc_skills?: Array<{ skill_id: number; level: string }>
  start_type?: string | null
  start_date?: string | null
  required_experience?: string | null
  weekly_hours?: number | null
  estimated_hours?: number | null
  own_car_required?: boolean
  application_method?: string | null
  contact_person?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  show_phone_publicly?: boolean
  application_url?: string | null
  required_documents?: string[]
  responsibilities?: string | null
  requirements_text?: string | null
  offer_text?: string | null
  skill_tags?: string[]
  is_foreign?: boolean
}

/** @deprecated Use {@link BRAND_DEFAULT_THUMB_SVG_PATH}; kept for existing imports. */
export const JOB_CARD_PLACEHOLDER_PATH = BRAND_DEFAULT_THUMB_SVG_PATH

/**
 * Map-pin line on job cards: city / obec only (first segment of `location`),
 * not the street from `location_address`. Falls back to the first comma segment of
 * `location_address` when `location` is empty.
 */
export function getJobCardCityDisplay(job: Pick<Job, 'location' | 'location_address'>): string {
  const area = (job.location ?? '').trim()
  if (area.length > 0) {
    const city = (area.split(',')[0] ?? area).trim()
    return city.length > 0 ? city : '—'
  }
  const street = (job.location_address ?? '').trim()
  if (street.length === 0) {
    return '—'
  }
  const segment = (street.split(',')[0] ?? street).trim()
  return segment.length > 0 ? segment : '—'
}

/** First job photo URL for list thumbnails, or placeholder when missing. */
export function getJobCardThumbnailSrc(job: Job): string {
  const first = job.photos?.find((u) => typeof u === 'string' && u.trim().length > 0)
  if (first) {
    return first.trim()
  }
  return JOB_CARD_PLACEHOLDER_PATH
}

/** Industry slugs for jobs and company ads. Must match `backend-ts/src/common/job-categories.constants.ts`. */
export const CATEGORIES = [
  'stavba',
  'domacnost',
  'zahrada',
  'stahovanie',
  'sklad',
  'eventy',
  'starostlivost',
  'gastro',
  'auto',
  'ine',
] as const

export type CategorySlug = (typeof CATEGORIES)[number]

export const JOB_TYPES = EMPLOYMENT_TYPES_FOR_FIND_FILTER

/** Extra filter values for zahraničné pracovné ponuky catalog. */
export const FOREIGN_JOB_TYPE_FILTERS = EMPLOYMENT_TYPES_FOR_FIND_FILTER_FOREIGN

export const COMPENSATION_TYPES = [
  { value: 'hourly', label: 'Hodinová sadzba' },
  { value: 'fixed', label: 'Fixná cena' },
  { value: 'on_request', label: 'Cena dohodou' },
  { value: 'auction', label: 'Aukcia' },
] as const

/** SK-formatted amount for compensation lines (no currency suffix). */
export function formatCompensationAmountSk(amount: number): string {
  return amount.toLocaleString('sk-SK', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

/** Short label from compensation fields only (no legacy `salary` column). */
export function getCompensationLabel(
  type: string | null | undefined,
  amount: number | null | undefined
): string {
  if (type === 'on_request') return 'Dohoda'
  if (type === 'auction') return 'Aukcia'
  if (type === 'hourly' && amount != null) return `${formatCompensationAmountSk(amount)} €/hod`
  if (type === 'fixed' && amount != null) return `${formatCompensationAmountSk(amount)} € za celú prácu`
  if (type === 'hourly' || type === 'fixed') return 'Dohoda'
  return amount != null ? `${formatCompensationAmountSk(amount)} €` : 'Dohoda'
}

/**
 * One-line pay for job cards: uses `compensation_type` / `compensation_amount` when set;
 * otherwise falls back to legacy `salary` text.
 */
function salaryTypeUnit(type: string | null | undefined): string {
  if (type === 'hourly') return ' €/hod.'
  if (type === 'one_time' || type === 'task_based') return ' €'
  if (type === 'monthly') return ' € mesačne'
  return ' €'
}

export function getJobCardPayDisplay(
  job: Pick<
    Job,
    | 'salary'
    | 'compensation_type'
    | 'compensation_amount'
    | 'salary_type'
    | 'salary_min'
    | 'salary_max'
    | 'salary_negotiable'
  >,
): string {
  if (job.salary_negotiable || job.salary_type === 'negotiable') {
    return 'Dohodou'
  }
  const min =
    job.salary_min != null && Number.isFinite(Number(job.salary_min))
      ? Number(job.salary_min)
      : null
  const max =
    job.salary_max != null && Number.isFinite(Number(job.salary_max))
      ? Number(job.salary_max)
      : null
  if (min != null || max != null) {
    const unit = salaryTypeUnit(job.salary_type)
    if (min != null && max != null && min !== max) {
      return `${formatCompensationAmountSk(min)} – ${formatCompensationAmountSk(max)}${unit}`
    }
    const val = min ?? max!
    return `${formatCompensationAmountSk(val)}${unit}`
  }
  const t = job.compensation_type
  if (t === 'hourly' || t === 'fixed' || t === 'on_request' || t === 'auction') {
    return getCompensationLabel(t, job.compensation_amount)
  }
  const sal = (job.salary ?? '').trim()
  if (sal.length > 0) return sal
  return getCompensationLabel(t, job.compensation_amount)
}

export function getJobPublicLocation(
  job: Pick<Job, 'location' | 'location_address' | 'city' | 'show_exact_address'>,
): string {
  if (job.show_exact_address && (job.location_address ?? '').trim()) {
    return (job.location_address ?? '').trim()
  }
  const city = (job.city ?? '').trim()
  if (city) return city
  return getJobCardCityDisplay(job)
}

const WORK_MODE_LABELS: Record<string, string> = {
  on_site: 'Na pracovisku',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

export function getJobCardWorkModeLabel(
  job: Pick<Job, 'work_mode' | 'work_modes'>,
): string {
  const modes = job.work_modes?.length
    ? job.work_modes
    : job.work_mode
      ? [job.work_mode]
      : []
  if (modes.length === 0) return ''
  return modes.map((m) => WORK_MODE_LABELS[m] ?? m).join(', ')
}

const categoryLabels: Record<string, string> = {
  stavba: 'Stavba',
  domacnost: 'Domácnosť',
  zahrada: 'Záhrada',
  stahovanie: 'Sťahovanie',
  sklad: 'Sklad',
  eventy: 'Eventy',
  starostlivost: 'Starostlivosť',
  gastro: 'Gastro',
  auto: 'Auto',
  ine: 'Iné',
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] ?? category
}

export function getJobTypeLabel(jobType: string | null | undefined): string {
  return employmentTypeLabel(jobType)
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (sec < 60) return 'práve teraz'
  const min = Math.floor(sec / 60)
  if (min < 60) return `pred ${min} min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `pred ${h} hod.`
  const days = Math.floor(h / 24)
  if (days === 1) return 'včera'
  if (days < 7) return `pred ${days} dňami`
  if (days < 30) return `pred ${Math.floor(days / 7)} týždňami`
  if (days < 365) return `pred ${Math.floor(days / 30)} mesiacmi`
  return `pred ${Math.floor(days / 365)} rokmi`
}

/** Two-letter initials for employer avatar on cards (e.g. "Martin Paček" → "MP"). */
export function employerInitials(name: string | null | undefined): string {
  const t = (name ?? '').trim()
  if (t.length === 0) return '?'
  const parts = t.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  const first = parts[0]![0] ?? ''
  const last = parts[parts.length - 1]![0] ?? ''
  return (first + last).toUpperCase()
}

function formatDateSkShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/** Application / completion deadline range for job cards (design-style). */
export function formatJobDateRange(job: Job): string {
  const a = formatDateSkShort(job.application_deadline)
  const c = formatDateSkShort(job.completion_deadline)
  if (a && c) return `${a} - ${c}`
  if (a) return a
  if (c) return c
  return '—'
}
