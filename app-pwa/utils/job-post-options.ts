import {
  EMPLOYMENT_TYPES_FOR_JOB_POST,
  EMPLOYMENT_TYPES_FOR_JOB_POST_FOREIGN,
  EMPLOYMENT_TYPES_FULL,
} from '~/utils/employment-types'
import {
  cvCategoriesToDriverLicenseIds,
  driverLicenseIdsToCvCategories,
} from '~/utils/cv-driving-license-categories'

export type JobAdKind = 'brigada' | 'tpp' | 'fuska'

export const JOB_AD_KIND_OPTIONS: { value: JobAdKind; label: string }[] = [
  { value: 'tpp', label: 'Pracovná ponuka' },
  { value: 'brigada', label: 'Brigáda' },
  { value: 'fuska', label: 'Fuška' },
]

/** Single-select typ úväzku on job post form (`/vytvorit-ponuku`). */
export const JOB_POST_EMPLOYMENT_OPTIONS = EMPLOYMENT_TYPES_FOR_JOB_POST

export const JOB_POST_FOREIGN_EMPLOYMENT_OPTIONS = EMPLOYMENT_TYPES_FOR_JOB_POST_FOREIGN

export type JobPostVariant = 'domestic' | 'foreign'

export function jobPostEmploymentOptionsForVariant(
  variant: JobPostVariant,
): ReadonlyArray<{ value: string; label: string }> {
  return variant === 'foreign'
    ? JOB_POST_FOREIGN_EMPLOYMENT_OPTIONS
    : JOB_POST_EMPLOYMENT_OPTIONS
}

/** Plný / skrátený / brigáda / stáž — shared „dátum nástupu“ (date or ASAP) in job post wizard. */
export const JOB_POST_STANDARD_NASTUP_EMPLOYMENT = [
  'full_time',
  'part_time',
  'brigada',
  'internship',
] as const

export type JobPostStandardNastupEmployment =
  (typeof JOB_POST_STANDARD_NASTUP_EMPLOYMENT)[number]

export function employmentUsesStandardNastup(employmentType: string): boolean {
  return (JOB_POST_STANDARD_NASTUP_EMPLOYMENT as readonly string[]).includes(
    employmentType,
  )
}

export function jobAdKindFromEmploymentType(value: string): JobAdKind {
  if (value === 'one_off') return 'fuska'
  if (value === 'brigada' || value === 'student_agreement') return 'brigada'
  if (value === 'turnus') return 'tpp'
  return 'tpp'
}

export const EMPLOYMENT_TYPE_OPTIONS = EMPLOYMENT_TYPES_FULL

export const WORK_MODE_OPTIONS = [
  { value: 'on_site', label: 'Na pracovisku' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
] as const

export type WorkModeValue = (typeof WORK_MODE_OPTIONS)[number]['value']

export const SALARY_TYPE_OPTIONS = [
  { value: 'hourly', label: 'Hodinová mzda' },
  { value: 'monthly', label: 'Mesačná mzda' },
  { value: 'one_time', label: 'Jednorazová odmena' },
  { value: 'task_based', label: 'Úkolová mzda' },
  { value: 'negotiable', label: 'Dohodou' },
] as const

export type SalaryTypeValue = (typeof SALARY_TYPE_OPTIONS)[number]['value']

/** Canonical field label for salary type across job post, find filters, and detail. */
export const SALARY_TYPE_FIELD_LABEL = 'Typ mzdy'

/** Find/catalog filter values — same set as selectable types on `/vytvorit-ponuku`. */
export const CATALOG_SALARY_FILTER_TYPES = [
  'hourly',
  'monthly',
  'one_time',
  'negotiable',
] as const satisfies readonly SalaryTypeValue[]

export type SalaryTypeFilterValue =
  | 'all'
  | (typeof CATALOG_SALARY_FILTER_TYPES)[number]

export const SALARY_TYPE_FILTER_OPTIONS: ReadonlyArray<{
  value: SalaryTypeFilterValue
  label: string
}> = [
  { value: 'all', label: 'Ľubovoľný typ mzdy' },
  ...SALARY_TYPE_OPTIONS.filter((o) =>
    (CATALOG_SALARY_FILTER_TYPES as readonly string[]).includes(o.value),
  ).map((o) => ({ value: o.value as SalaryTypeFilterValue, label: o.label })),
]

const SALARY_TYPE_LABEL_BY_VALUE = new Map(
  SALARY_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

export function getSalaryTypeLabel(
  value: string | null | undefined,
  fallback = 'Plat',
): string {
  const v = (value ?? '').trim()
  if (!v) return fallback
  if (v === 'negotiable') return SALARY_TYPE_LABEL_BY_VALUE.get('negotiable') ?? fallback
  return SALARY_TYPE_LABEL_BY_VALUE.get(v as SalaryTypeValue) ?? fallback
}

/** Map legacy find/catalog `compensation_type` query to `salary_type`. */
export function mapLegacyCompensationToSalaryType(
  compensationType: string | null | undefined,
): SalaryTypeValue | null {
  const c = (compensationType ?? '').trim()
  if (c === 'hourly') return 'hourly'
  /** Legacy catalog „Fixná“ → lump-sum offers (`one_time`). */
  if (c === 'fixed') return 'one_time'
  if (c === 'on_request') return 'negotiable'
  return null
}

function isCatalogSalaryFilterValue(
  value: string,
): value is (typeof CATALOG_SALARY_FILTER_TYPES)[number] {
  return (CATALOG_SALARY_FILTER_TYPES as readonly string[]).includes(value)
}

export function parseSalaryTypeFilterFromRoute(
  salaryTypeRaw: string,
  legacyCompensationRaw: string,
): SalaryTypeFilterValue {
  const st = salaryTypeRaw.trim()
  if (isCatalogSalaryFilterValue(st)) {
    return st
  }
  const mapped = mapLegacyCompensationToSalaryType(legacyCompensationRaw)
  if (mapped && isCatalogSalaryFilterValue(mapped)) {
    return mapped
  }
  return 'all'
}

/** Whether find filter shows a minimum amount input for this stored `salary_type`. */
export function salaryTypeFilterShowsMinAmount(storedSalaryType: string): boolean {
  const st = storedSalaryType.trim()
  return st === 'hourly' || st === 'monthly' || st === 'one_time'
}

const STANDARD_EMPLOYMENT_SALARY_TYPES: SalaryTypeValue[] = [
  'hourly',
  'monthly',
  'negotiable',
]

const ONE_OFF_SALARY_TYPES: SalaryTypeValue[] = [
  'one_time',
  'hourly',
  'negotiable',
]

/** Plat typ options allowed for the selected typ úväzku on `/vytvorit-ponuku`. */
export function allowedSalaryTypesForEmployment(
  employmentType: string,
): SalaryTypeValue[] {
  if (employmentType === 'one_off') return [...ONE_OFF_SALARY_TYPES]
  return [...STANDARD_EMPLOYMENT_SALARY_TYPES]
}

export function salaryTypeOptionsForEmployment(employmentType: string): {
  value: SalaryTypeValue
  label: string
}[] {
  const allowed = new Set(allowedSalaryTypesForEmployment(employmentType))
  return SALARY_TYPE_OPTIONS.filter((o) => allowed.has(o.value)).map((o) => ({
    value: o.value,
    label: o.label,
  }))
}

export const REQUIRED_EXPERIENCE_OPTIONS = [
  { value: 'any', label: 'Nerozhoduje' },
  { value: 'none', label: 'Bez praxe' },
  { value: 'lt1', label: 'Menej ako 1 rok' },
  { value: 'y1_2', label: '1–2 roky' },
  { value: 'y3_5', label: '3–5 rokov' },
  { value: 'y6_plus', label: '6+ rokov' },
] as const

export const JOB_POST_START_TYPE_OPTIONS = [
  { value: 'asap' as const, labelKey: 'jobAlertsStartAsap' as const },
  { value: 'by_agreement' as const, labelKey: 'jobAlertsStartByAgreement' as const },
  { value: 'date' as const, labelKey: 'jobAlertsStartConcreteDate' as const },
]

export const APPLICATION_METHOD_OPTIONS = [
  { value: 'platform', label: 'Cez platformu' },
  { value: 'email', label: 'E-mailom' },
  { value: 'phone', label: 'Telefonicky' },
  { value: 'external', label: 'Externý odkaz' },
] as const

export type ApplicationMethodValue =
  (typeof APPLICATION_METHOD_OPTIONS)[number]['value']

export const REQUIRED_DOCUMENT_OPTIONS = [
  { value: 'cv', label: 'Životopis' },
  { value: 'cover_letter', label: 'Motivačný list' },
  { value: 'portfolio', label: 'Portfólio' },
  { value: 'certificate', label: 'Certifikát' },
  { value: 'none', label: 'Nie je potrebné nič' },
] as const

/** Required documents selectable on `/vytvorit-ponuku` (no portfólio / certifikát). */
export const JOB_POST_REQUIRED_DOCUMENT_OPTIONS = REQUIRED_DOCUMENT_OPTIONS.filter(
  (o) => o.value !== 'portfolio' && o.value !== 'certificate',
)

const jobPostRequiredDocumentValues = new Set(
  JOB_POST_REQUIRED_DOCUMENT_OPTIONS.map((o) => o.value),
)

export function normalizeJobPostRequiredDocuments(docs: string[]): string[] {
  const filtered = docs.filter((d) => jobPostRequiredDocumentValues.has(d))
  return filtered.length > 0 ? filtered : ['cv']
}

/** CEFR display for API language levels. */
export const LANGUAGE_LEVEL_CEFR_LABELS: Record<string, string> = {
  undefined: 'A1',
  elementary: 'A2',
  intermediate: 'B1',
  master: 'C1',
}

export function salaryUnitForType(type: SalaryTypeValue | ''): string {
  if (type === 'hourly') return '€/hod'
  if (type === 'one_time' || type === 'task_based') return '€'
  return '€/mes'
}

export function applyEmploymentTypeDefaults(employmentType: string): {
  salaryType: SalaryTypeValue
  requiredDocuments: string[]
} {
  if (employmentType === 'one_off') {
    return { salaryType: 'one_time', requiredDocuments: ['none'] }
  }
  if (employmentType === 'brigada' || employmentType === 'student_agreement') {
    return { salaryType: 'hourly', requiredDocuments: ['cv'] }
  }
  if (employmentType === 'part_time') {
    return { salaryType: 'hourly', requiredDocuments: ['cv'] }
  }
  if (employmentType === 'turnus') {
    return { salaryType: 'monthly', requiredDocuments: ['cv'] }
  }
  return { salaryType: 'monthly', requiredDocuments: ['cv'] }
}

/** @deprecated Use applyEmploymentTypeDefaults + jobAdKindFromEmploymentType */
export function applyAdKindDefaults(kind: JobAdKind): {
  employmentTypes: string[]
  salaryType: SalaryTypeValue
  requiredDocuments: string[]
} {
  const employmentType =
    kind === 'fuska' ? 'one_off' : kind === 'brigada' ? 'brigada' : 'full_time'
  const d = applyEmploymentTypeDefaults(employmentType)
  return {
    employmentTypes: [employmentType],
    salaryType: d.salaryType,
    requiredDocuments: d.requiredDocuments,
  }
}

export function employmentTypeFromLegacyJobType(
  jobType: string | null | undefined,
): string {
  if (jobType === 'fuska') return 'one_off'
  if (jobType === 'brigada') return 'brigada'
  if (jobType === 'tpp') return 'full_time'
  return 'brigada'
}

/** Map stored/API values to a selectable option on job post wizard. */
export function normalizeJobPostEmploymentType(
  value: string,
  variant: JobPostVariant = 'domestic',
): string {
  if (value === 'student_agreement') return 'brigada'
  const allowed = new Set(
    jobPostEmploymentOptionsForVariant(variant).map((o) => o.value),
  )
  if (allowed.has(value)) return value
  return variant === 'foreign' ? 'full_time' : 'brigada'
}

/** @deprecated Job post form uses CV categories via `cv-driving-license-categories.ts`. */
export const JOB_POST_DRIVER_LICENSES: ReadonlyArray<{
  id: number
  label: string
}> = [
  { id: 1, label: 'A' },
  { id: 5, label: 'B' },
  { id: 7, label: 'C' },
  { id: 9, label: 'D' },
  { id: 17, label: 'E' },
  { id: 16, label: 'T' },
]

/** @deprecated Use `driverLicenseIdsToCvCategories` + `cvCategoriesToDriverLicenseIds`. */
export function normalizeJobPostDriverLicenses(ids: number[]): number[] {
  return cvCategoriesToDriverLicenseIds(driverLicenseIdsToCvCategories(ids))
}
