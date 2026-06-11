/* ------------------------------------------------------------------ *
 * Employer CV database — list item / response shapes.                 *
 * Used by the company-facing /databaza-zivotopisov page.              *
 * ------------------------------------------------------------------ */

export interface EmployerCvDatabaseListItem {
  cv_id: string
  candidate_display_name: string
  avatar_url: string | null
  location: string | null
  desired_positions: string[]
  employment_types: string[]
  start_availability: string | null
  salary_min: number | null
  salary_currency: string | null
  salary_period: string | null
  top_skills: string[]
  languages: { language: string; level: string | null }[]
  latest_experience: {
    position: string
    company: string
    current: boolean
    start_date: string | null
    end_date: string | null
  } | null
  /** Total whole years of work experience, derived on the backend. */
  years_of_experience: number | null
  updated_at: string
  /** One-line school · field for list cards. */
  education_summary: string | null
  /** Employer may see e-mail/phone (candidate shared or already unlocked). */
  contacts_visible: boolean
  contact_email: string | null
  contact_phone: string | null
  /** Locked CV with contact on file — show unlock CTA. */
  has_contact_to_unlock: boolean
}

export interface EmployerCvDatabaseListResponse {
  items: EmployerCvDatabaseListItem[]
  total: number
  offset: number
  limit: number
  total_is_partial?: boolean
}

export interface CvEmployerOpenChatApplication {
  id: string
  job_title: string | null
  status: string
}

export type CvEmployerOpenChatResult =
  | { room_id: string }
  | { applications: CvEmployerOpenChatApplication[] }

/** Read-only aggregate from GET employer/cv-database/:cvId (subset for UI). */
export interface CvEmployerAggregate {
  cv: {
    id: string
    user_id: string
    display_title?: string | null
    cv_title?: string | null
    photo_url?: string | null
    about_me?: string | null
    visible_to_employers?: boolean
    show_contact_details?: boolean
    contact_unlocked?: boolean
    contacts_visible?: boolean
    has_contact_to_unlock?: boolean
    email?: string | null
    phone?: string | null
    linkedin_url?: string | null
    [key: string]: unknown
  }
  experience: Array<{
    id: string
    company: string
    position: string
    current: boolean
    start_date: string | null
    end_date: string | null
    description: string | null
    bullets?: string[]
  }>
  education: Array<{
    id: string
    school: string
    degree: string | null
    field: string | null
    start_date: string | null
    end_date: string | null
  }>
  skills: Array<{ id: string; skill_name: string; level: string | null }>
  soft_skills: Array<{ id: string; skill_name: string }>
  languages: Array<{ id: string; language: string; level: string | null }>
  certifications: Array<{ id: string; name: string; issuer: string | null }>
  links: Array<{ id: string; type: string; url: string }>
  volunteering: Array<{ id: string; role_title: string; organization: string }>
  portfolio_links: Array<{ id: string; label: string; url: string }>
  awards: Array<{ id: string; title: string; issuer: string | null }>
  references: Array<{ id: string; person_name: string; organization: string | null }>
}

/* ------------------------------------------------------------------ *
 * Filter model — hero pill grid on /databaza-zivotopisov.             *
 * ------------------------------------------------------------------ */

export const CV_DB_JOB_TYPES = [
  'full_time',
  'part_time',
  'brigada',
  'internship',
  'one_off',
] as const
export type CvDbJobType = (typeof CV_DB_JOB_TYPES)[number]

export const CV_DB_EXPERIENCE_RANGES = [
  '',
  'none',
  'lt1',
  '1_2',
  '3_5',
  '6_10',
  '10p',
] as const
export type CvDbExperienceRange = (typeof CV_DB_EXPERIENCE_RANGES)[number]

export const CV_DB_AVAILABILITY = [
  '',
  'immediately',
  'by_agreement',
  'within_1_month',
  'within_2_months',
  'within_3_months',
] as const
export type CvDbAvailability = (typeof CV_DB_AVAILABILITY)[number]

export const CV_DB_RADIUS = ['', 'exact', '10', '25', '50', '100', 'sk'] as const
export type CvDbRadius = (typeof CV_DB_RADIUS)[number]

export const CV_DB_LANG_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CvDbLanguageLevel = (typeof CV_DB_LANG_LEVELS)[number]

export const CV_DB_EDUCATION_LEVELS = [
  '',
  'basic',
  'secondary',
  'secondary_with_graduation',
  'university_bc',
  'university_mgr',
  'university_phd',
  'course',
] as const
export type CvDbEducationLevel = (typeof CV_DB_EDUCATION_LEVELS)[number]

export const CV_DB_SORT = [
  'best_match',
  'last_active',
  'last_updated',
  'salary_asc',
  'experience_desc',
] as const
export type CvDbSort = (typeof CV_DB_SORT)[number]

export interface CvDatabaseFiltersModel {
  q: string
  location: string
  radius: CvDbRadius
  jobTypes: CvDbJobType[]
  skills: string[]
  experience: CvDbExperienceRange
  availability: CvDbAvailability
  /** Recruiter-facing "Plat do" — candidate matches if expected min <= this. */
  salaryMax: string
  languages: string[]
  languageLevels: Partial<Record<string, CvDbLanguageLevel>>
  educationLevel: CvDbEducationLevel
  sort: CvDbSort
}

export function defaultCvDatabaseFilters(): CvDatabaseFiltersModel {
  return {
    q: '',
    location: '',
    radius: '',
    jobTypes: [],
    skills: [],
    experience: '',
    availability: '',
    salaryMax: '',
    languages: [],
    languageLevels: {},
    educationLevel: '',
    sort: 'best_match',
  }
}
