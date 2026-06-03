import type { LocationQuery } from 'vue-router'
import {
  CV_DB_AVAILABILITY,
  CV_DB_EDUCATION_LEVELS,
  CV_DB_EXPERIENCE_RANGES,
  CV_DB_JOB_TYPES,
  CV_DB_LANG_LEVELS,
  CV_DB_RADIUS,
  CV_DB_SORT,
  type CvDatabaseFiltersModel,
  type CvDbAvailability,
  type CvDbEducationLevel,
  type CvDbExperienceRange,
  type CvDbJobType,
  type CvDbLanguageLevel,
  type CvDbRadius,
  type CvDbSort,
  defaultCvDatabaseFilters,
} from '~/types/employer-cv-database'
import { employmentTypeLabel } from '~/utils/employment-types'
import { S } from '~/utils/strings'

/* URL query ↔ CvDatabaseFiltersModel — keep filter state shareable via router (employer search). */

function readStr(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === 'string' && v !== '')
    return typeof first === 'string' ? first : ''
  }
  return typeof value === 'string' ? value : ''
}

function readStrList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
  }
  return []
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const s = readStr(value)
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback
}

function readEnumList<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  const seen = new Set<T>()
  for (const raw of readStrList(value)) {
    if ((allowed as readonly string[]).includes(raw)) {
      seen.add(raw as T)
    }
  }
  return [...seen]
}

function parseLanguageLevels(value: unknown): Partial<Record<string, CvDbLanguageLevel>> {
  const raw = readStr(value)
  if (!raw) return {}
  const out: Partial<Record<string, CvDbLanguageLevel>> = {}
  for (const pair of raw.split(',')) {
    const [lang, lvl] = pair.split(':').map((s) => s.trim())
    if (!lang || !lvl) continue
    if ((CV_DB_LANG_LEVELS as readonly string[]).includes(lvl)) {
      out[lang.toLowerCase()] = lvl as CvDbLanguageLevel
    }
  }
  return out
}

function serializeLanguageLevels(
  levels: Partial<Record<string, CvDbLanguageLevel>>,
): string {
  return Object.entries(levels)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
}

function readNonNegInt(value: unknown): string {
  const s = readStr(value).trim()
  if (s === '') return ''
  const n = Number.parseInt(s, 10)
  if (!Number.isFinite(n) || n < 0) return ''
  return String(n)
}

export function parseCandidateFiltersFromQuery(
  query: LocationQuery,
): CvDatabaseFiltersModel {
  const base = defaultCvDatabaseFilters()
  const q: Record<string, unknown> = query as unknown as Record<string, unknown>

  base.q = readStr(q.q)
  base.location = readStr(q.location) || readStr(q.city)
  base.radius = readEnum<CvDbRadius>(q.radius, CV_DB_RADIUS, '')
  base.jobTypes = readEnumList<CvDbJobType>(q.jobTypes, CV_DB_JOB_TYPES)
  base.skills = readStrList(q.skills)
  base.experience = readEnum<CvDbExperienceRange>(
    q.experience,
    CV_DB_EXPERIENCE_RANGES,
    '',
  )
  base.availability = readEnum<CvDbAvailability>(
    q.availability,
    CV_DB_AVAILABILITY,
    '',
  )
  base.salaryMax = readNonNegInt(q.salaryMax) || readNonNegInt(q.salary_max)

  base.languages = readStrList(q.languages)
  base.languageLevels = parseLanguageLevels(q.languageLevels)

  base.educationLevel = readEnum<CvDbEducationLevel>(
    q.educationLevel,
    CV_DB_EDUCATION_LEVELS,
    '',
  )

  base.sort = readEnum<CvDbSort>(q.sort, CV_DB_SORT, 'best_match')

  if (!base.location.trim()) {
    base.radius = ''
  }

  return base
}

type RawQueryValue = string | string[] | undefined

export function serializeCandidateFiltersToQuery(
  model: CvDatabaseFiltersModel,
): Record<string, RawQueryValue> {
  const out: Record<string, RawQueryValue> = {}

  if (model.q.trim()) out.q = model.q.trim()
  if (model.location.trim()) {
    out.location = model.location.trim()
    if (model.radius && model.radius !== '') out.radius = model.radius
  }
  if (model.jobTypes.length) out.jobTypes = [...model.jobTypes]
  if (model.skills.length) out.skills = [...model.skills]
  if (model.experience) out.experience = model.experience
  if (model.availability) out.availability = model.availability
  if (model.salaryMax) out.salaryMax = model.salaryMax

  if (model.languages.length) out.languages = [...model.languages]
  const ll = serializeLanguageLevels(model.languageLevels)
  if (ll) out.languageLevels = ll

  if (model.educationLevel) out.educationLevel = model.educationLevel

  if (model.sort && model.sort !== 'best_match') out.sort = model.sort

  return out
}

export interface CvDatabaseFilterChip {
  id: keyof CvDatabaseFiltersModel
  label: string
  value?: string
}

const EXPERIENCE_LABELS: Record<CvDbExperienceRange, () => string> = {
  '': () => '',
  none: () => S.cvDbExpNone,
  lt1: () => S.cvDbExpLt1,
  '1_2': () => S.cvDbExp12,
  '3_5': () => S.cvDbExp35,
  '6_10': () => S.cvDbExp610,
  '10p': () => S.cvDbExp10p,
}

const AVAILABILITY_LABELS: Record<CvDbAvailability, () => string> = {
  '': () => '',
  immediately: () => S.cvDbAvailImmediate,
  by_agreement: () => S.cvDbAvailAgreement,
  within_1_month: () => S.cvDbAvailWithin1,
  within_2_months: () => S.cvDbAvailWithin2,
  within_3_months: () => S.cvDbAvailWithin3,
}

const RADIUS_LABELS: Record<CvDbRadius, () => string> = {
  '': () => '',
  exact: () => S.cvDbRadiusExact,
  '10': () => S.cvDbRadius10,
  '25': () => S.cvDbRadius25,
  '50': () => S.cvDbRadius50,
  '100': () => S.cvDbRadius100,
  sk: () => S.cvDbRadiusAll,
}

const EDU_LEVEL_LABELS: Record<CvDbEducationLevel, () => string> = {
  '': () => '',
  basic: () => S.cvDbEduBasic,
  secondary: () => S.cvDbEduSecondary,
  secondary_with_graduation: () => S.cvDbEduSecondaryGrad,
  university_bc: () => S.cvDbEduBc,
  university_mgr: () => S.cvDbEduMgr,
  university_phd: () => S.cvDbEduPhd,
  course: () => S.cvDbEduCourse,
}

const SORT_LABELS: Record<CvDbSort, () => string> = {
  best_match: () => S.cvDbSortBestMatch,
  last_active: () => S.cvDbSortLastActive,
  last_updated: () => S.cvDbSortLastUpdated,
  salary_asc: () => S.cvDbSortSalaryAsc,
  experience_desc: () => S.cvDbSortExperienceDesc,
}

function jobTypeLabel(v: CvDbJobType): string {
  return employmentTypeLabel(v) || v
}

export function getActiveFilterChips(
  model: CvDatabaseFiltersModel,
): CvDatabaseFilterChip[] {
  const chips: CvDatabaseFilterChip[] = []
  const push = (id: keyof CvDatabaseFiltersModel, label: string, value?: string): void => {
    chips.push({ id, label, value })
  }

  if (model.q.trim()) push('q', `${S.cvDbChipSearch}: ${model.q.trim()}`)

  if (model.location.trim()) {
    const rl = RADIUS_LABELS[model.radius]()
    push(
      'location',
      rl
        ? `${S.cvDbBasicLocation}: ${model.location.trim()} · ${rl}`
        : `${S.cvDbBasicLocation}: ${model.location.trim()}`,
    )
  }

  for (const jt of model.jobTypes) {
    push('jobTypes', `${S.cvDbBasicJobType}: ${jobTypeLabel(jt)}`, jt)
  }

  for (const sk of model.skills) {
    push('skills', `${S.cvDbBasicSkills}: ${sk}`, sk)
  }

  if (model.experience) {
    push('experience', `${S.cvDbBasicExperience}: ${EXPERIENCE_LABELS[model.experience]()}`)
  }

  if (model.availability) {
    push(
      'availability',
      `${S.cvDbBasicAvailability}: ${AVAILABILITY_LABELS[model.availability]()}`,
    )
  }

  if (model.salaryMax) push('salaryMax', `${S.cvDbBasicSalaryMax}: ${model.salaryMax} €`)

  if (model.sort && model.sort !== 'best_match') {
    push('sort', `${S.cvDbLabelSort}: ${SORT_LABELS[model.sort]()}`)
  }

  for (const lang of model.languages.filter((l) => l.trim())) {
    const lvl = model.languageLevels[lang.toLowerCase()]
    push(
      'languages',
      lvl ? `${S.cvDbAdvSecLanguages}: ${lang} · ${lvl}` : `${S.cvDbAdvSecLanguages}: ${lang}`,
      lang,
    )
  }

  if (model.educationLevel) {
    push(
      'educationLevel',
      `${S.cvDbBasicEducation}: ${EDU_LEVEL_LABELS[model.educationLevel]()}`,
    )
  }

  return chips
}

export function clearCandidateFilter(
  model: CvDatabaseFiltersModel,
  id: keyof CvDatabaseFiltersModel,
  value?: string,
): CvDatabaseFiltersModel {
  const def = defaultCvDatabaseFilters()
  const next: CvDatabaseFiltersModel = { ...model }

  switch (id) {
    case 'jobTypes':
      next.jobTypes = value
        ? model.jobTypes.filter((j) => j !== value)
        : [...def.jobTypes]
      break
    case 'skills':
      next.skills = value ? model.skills.filter((s) => s !== value) : [...def.skills]
      break
    case 'languages':
      if (value) {
        next.languages = model.languages.filter((l) => l !== value)
        const nl = { ...model.languageLevels }
        delete nl[value.toLowerCase()]
        next.languageLevels = nl
      } else {
        next.languages = [...def.languages]
        next.languageLevels = { ...def.languageLevels }
      }
      break
    case 'location':
      next.location = def.location
      next.radius = def.radius
      break
    default:
      ;(next as Record<string, unknown>)[id] = (def as Record<string, unknown>)[id]
  }

  return next
}

export function hasActiveFilters(model: CvDatabaseFiltersModel): boolean {
  return getActiveFilterChips(model).length > 0
}

export interface ExperienceRangeBounds {
  minYears: number
  maxYears: number | null
}

export function getExperienceRange(id: CvDbExperienceRange): ExperienceRangeBounds | null {
  switch (id) {
    case 'none':
      return { minYears: 0, maxYears: 1 }
    case 'lt1':
      return { minYears: 0, maxYears: 1 }
    case '1_2':
      return { minYears: 1, maxYears: 3 }
    case '3_5':
      return { minYears: 3, maxYears: 6 }
    case '6_10':
      return { minYears: 6, maxYears: 11 }
    case '10p':
      return { minYears: 10, maxYears: null }
    case '':
    default:
      return null
  }
}

const LEVEL_ORDER: Record<CvDbLanguageLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
}

export function languageLevelMeetsMinimum(
  have: string | null | undefined,
  min: CvDbLanguageLevel,
): boolean {
  if (!have) return false
  const normalized = String(have).trim().toUpperCase() as CvDbLanguageLevel
  const got = LEVEL_ORDER[normalized]
  if (!got) return false
  return got >= LEVEL_ORDER[min]
}

export function formatSalary(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return ''
  const n = typeof amount === 'number' ? amount : Number.parseFloat(String(amount))
  if (!Number.isFinite(n)) return ''
  return `${Math.round(n).toLocaleString('sk-SK')} €`
}

export function formatCandidateName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  options: { initialOnly?: boolean } = {},
): string {
  const fn = (firstName ?? '').trim()
  const ln = (lastName ?? '').trim()
  if (!fn && !ln) return ''
  if (options.initialOnly && ln) {
    return [fn, `${ln.charAt(0)}.`].filter(Boolean).join(' ')
  }
  return [fn, ln].filter(Boolean).join(' ')
}
