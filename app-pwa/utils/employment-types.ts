/**
 * Canonical Slovak labels for `employment_types` / job catalog filters.
 * Aligned with backend `JOB_EMPLOYMENT_TYPES` (job-offer.constants.ts).
 */

export const EMPLOYMENT_TYPE_VALUES = [
  'full_time',
  'part_time',
  'brigada',
  'zivnost',
  'internship',
  'agreement',
  'student_agreement',
  'home_work',
  'volunteer',
  'one_off',
  'turnus',
] as const

export type EmploymentTypeValue = (typeof EMPLOYMENT_TYPE_VALUES)[number]

/**
 * Standard typ úväzku choices for catalog filters, email alerts, and CV DB.
 * Same set as job post wizard (domestic).
 */
export const EMPLOYMENT_TYPES_STANDARD_FILTER_VALUES = [
  'full_time',
  'part_time',
  'brigada',
  'internship',
  'one_off',
] as const

export type EmploymentTypeStandardFilterValue =
  (typeof EMPLOYMENT_TYPES_STANDARD_FILTER_VALUES)[number]

/** CV database filter values — match `cvs` / CV header `employment_types`. */
export const CV_DB_JOB_TYPE_FILTER_VALUES = EMPLOYMENT_TYPES_STANDARD_FILTER_VALUES

export type CvDbJobTypeFilterValue = EmploymentTypeStandardFilterValue

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Plný úväzok',
  part_time: 'Skrátený úväzok',
  brigada: 'Brigáda (dohoda)',
  zivnost: 'Práca na živnosť',
  agreement: 'Dohoda',
  student_agreement: 'Dohoda o brigádnickej práci študentov',
  home_work: 'Domácka práca a telepráca',
  internship: 'Stáž',
  volunteer: 'Dobrovoľnícka práca',
  one_off: 'Jednorazová práca',
  turnus: 'Turnusová práca',
}

/** Legacy / filter aliases → canonical employment type for label lookup. */
const EMPLOYMENT_TYPE_ALIASES: Record<string, EmploymentTypeValue | 'agreement'> = {
  fuska: 'one_off',
  self_employed: 'zivnost',
}

export function employmentTypeLabel(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const alias = EMPLOYMENT_TYPE_ALIASES[trimmed]
  if (alias) {
    return EMPLOYMENT_TYPE_LABELS[alias] ?? trimmed
  }
  return EMPLOYMENT_TYPE_LABELS[trimmed] ?? trimmed
}

export function employmentTypeOptions(
  values: readonly string[],
): ReadonlyArray<{ value: string; label: string }> {
  return values.map((value) => ({
    value,
    label: employmentTypeLabel(value),
  }))
}

/** Full list (job alerts Worki-style sections, detail pills). */
export const EMPLOYMENT_TYPES_FULL = employmentTypeOptions(EMPLOYMENT_TYPE_VALUES)

/** Job post wizard (`/vytvorit-ponuku`). */
export const EMPLOYMENT_TYPES_FOR_JOB_POST = employmentTypeOptions([
  ...EMPLOYMENT_TYPES_STANDARD_FILTER_VALUES,
])

export const EMPLOYMENT_TYPES_FOR_JOB_POST_FOREIGN = employmentTypeOptions([
  ...EMPLOYMENT_TYPES_STANDARD_FILTER_VALUES,
  'turnus',
])

/** Find jobs catalog filter (`/pracovne-ponuky`). */
export const EMPLOYMENT_TYPES_FOR_FIND_FILTER = employmentTypeOptions([
  ...EMPLOYMENT_TYPES_STANDARD_FILTER_VALUES,
])

export const EMPLOYMENT_TYPES_FOR_FIND_FILTER_FOREIGN = employmentTypeOptions(['turnus'])

/** Job email alert wizard pills. */
export const EMPLOYMENT_TYPES_FOR_JOB_ALERT = employmentTypeOptions([
  ...EMPLOYMENT_TYPES_STANDARD_FILTER_VALUES,
])

/** Employer CV database basic filter dropdown. */
export const EMPLOYMENT_TYPES_FOR_CV_DB_FILTER = employmentTypeOptions([
  ...CV_DB_JOB_TYPE_FILTER_VALUES,
])
