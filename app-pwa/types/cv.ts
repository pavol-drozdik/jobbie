/**
 * Mirrors backend `cv.dto` aggregate shapes (subset used by the PWA).
 */
export type CvTemplateKey =
  | 'modern'
  | 'minimal'
  | 'professional'
  | 'creative'
  | 'elegant'
  | 'classic'

export type CvWizardStep = 'template' | 'editor' | 'final'

export interface CvListItemResponseDto {
  id: string
  user_id: string
  display_title: string
  template_key: CvTemplateKey
  visible_to_employers: boolean
  is_default_for_profile: boolean
  draft_saved_at: string | null
  updated_at: string
  wizard_step: CvWizardStep
  created_at: string
}

export interface CvHeaderResponseDto {
  id: string
  user_id: string
  is_default_for_profile: boolean
  display_title: string
  full_name: string | null
  headline: string | null
  bio: string | null
  phone: string | null
  email: string | null
  location: string | null
  photo_url: string | null
  first_name: string | null
  last_name: string | null
  show_academic_title: boolean
  academic_title: string | null
  title_before_name: string | null
  title_after_name: string | null
  birth_date: string | null
  show_birth_date: boolean
  linkedin_url: string | null
  show_contact_details: boolean
  address_country: string | null
  address_postal_code: string | null
  address_district: string | null
  address_city: string | null
  address_street: string | null
  about_me: string | null
  cv_title: string | null
  visible_to_employers: boolean
  driving_license_categories: string[]
  approximate_km_driven: number | null
  additional_skills_info: string | null
  hobbies: string | null
  highest_education_level: string | null
  gdpr_consent: boolean
  terms_consent: boolean
  marketing_consent: boolean
  template_key: CvTemplateKey
  wizard_step: string
  wizard_section: string | null
  optional_sections: Record<string, unknown>
  gender: string | null
  birth_day: number | null
  birth_month: number | null
  birth_year: number | null
  address_optional_collapsed: boolean
  photo_storage_path: string | null
  /** Ephemeral signed/public URL for owner UI preview (not persisted). */
  photo_view_url?: string | null
  pdf_generation_status?: 'pending' | 'ready' | 'failed' | string
  pdf_generated_at?: string | null
  photo_original_mime: string | null
  desired_positions: string[]
  desired_locations: string[]
  employment_types: string[]
  start_availability: string | null
  salary_min: number | null
  salary_currency: string | null
  salary_period: string | null
  weekend_work: boolean | null
  night_work: boolean | null
  open_to_relocate_commute: boolean | null
  remote_work_only: boolean | null
  has_disability: boolean
  email_job_alerts: boolean
  pdf_settings: Record<string, unknown>
  draft_saved_at: string | null
  created_at: string
  updated_at: string
}

export interface ExperienceResponseDto {
  id: string
  cv_id: string
  entry_type: string
  company: string
  position: string
  city: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  current: boolean
  description: string | null
  achievements: string | null
  bullets: string[]
  sort_order: number
}

export interface EducationResponseDto {
  id: string
  cv_id: string
  education_kind: string
  school: string
  degree: string | null
  field: string | null
  start_date: string | null
  end_date: string | null
  city: string | null
  country: string | null
  institution: string | null
  faculty: string | null
  study_level: string | null
  start_year: number | null
  end_year: number | null
  has_graduation: boolean
  currently_studying: boolean
  description: string | null
  bullets: string[]
  certificate_name: string | null
  certificate_url: string | null
  certificate_file_url: string | null
  issued_year: number | null
  sort_order: number
}

export interface SkillResponseDto {
  id: string
  cv_id: string
  skill_name: string
  level: string | null
  sort_order: number
}

export interface SoftSkillResponseDto {
  id: string
  cv_id: string
  skill_name: string
  sort_order: number
}

export interface LanguageResponseDto {
  id: string
  cv_id: string
  language: string
  level: string | null
  sort_order: number
}

export interface CertificationResponseDto {
  id: string
  cv_id: string
  name: string
  issuer: string | null
  issued_date: string | null
  issued_year: number | null
  description: string | null
  certificate_url: string | null
  certificate_file_url: string | null
  sort_order: number
}

export interface LinkResponseDto {
  id: string
  cv_id: string
  type: string
  url: string
  sort_order: number
}

export interface PortfolioLinkResponseDto {
  id: string
  cv_id: string
  label: string
  url: string
  sort_order: number
}

export interface VolunteeringResponseDto {
  id: string
  cv_id: string
  role_title: string
  organization: string
  city: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  current: boolean
  description: string | null
  bullets: string[]
  sort_order: number
}

export interface AwardResponseDto {
  id: string
  cv_id: string
  title: string
  issuer: string | null
  issued_year: number | null
  description: string | null
  sort_order: number
}

export interface ReferenceResponseDto {
  id: string
  cv_id: string
  person_name: string
  organization: string | null
  position: string | null
  email: string | null
  phone: string | null
  relationship_note: string | null
  sort_order: number
}

export interface CvAggregateResponseDto {
  cv: CvHeaderResponseDto
  experience: ExperienceResponseDto[]
  education: EducationResponseDto[]
  skills: SkillResponseDto[]
  soft_skills: SoftSkillResponseDto[]
  languages: LanguageResponseDto[]
  certifications: CertificationResponseDto[]
  links: LinkResponseDto[]
  volunteering: VolunteeringResponseDto[]
  portfolio_links: PortfolioLinkResponseDto[]
  awards: AwardResponseDto[]
  references: ReferenceResponseDto[]
}
