import type { ApplicationStatus } from '~/utils/applicant-status'

export type ApplicantStatusCounts = {
  pending: number
  reviewing: number
  interview_invited: number
  rejected: number
  accepted: number
  withdrawn: number
  total: number
}

export type EmployerJobHubItem = {
  id: string
  title: string
  location: string | null
  job_type: string | null
  work_mode: string | null
  listing_status: string
  published_at: string
  expires_at: string | null
  applications_count: number
  status_counts: ApplicantStatusCounts
  last_application_at: string | null
  has_new_applications: boolean
}

export type EmployerJobsHubResponse = {
  items: EmployerJobHubItem[]
  total: number
  offset: number
  limit: number
}

export type EmployerApplicantRow = {
  application_id: string
  individual_id: string
  status: ApplicationStatus | string
  applied_at: string
  full_name: string
  email: string | null
  phone: string | null
  location: string | null
  has_cv: boolean
  cv_id: string | null
  uses_profile_cv: boolean
  chat_room_id: string | null
  message_preview: string | null
  has_note: boolean
  note_preview: string | null
  photo_url: string | null
  desired_position: string | null
  experience_years: number | null
  availability: string | null
  salary_display: string | null
  top_skills: string[]
  languages: string[]
  documents: string[]
}

export type EmployerApplicantsListResponse = {
  items: EmployerApplicantRow[]
  total: number
  offset: number
  limit: number
  status_counts: ApplicantStatusCounts
}

export type EmployerJobReplySettings = {
  job_id: string
  company_id: string
  rejection_auto_reply_enabled: boolean
  rejection_subject: string
  rejection_template: string
  interview_auto_reply_enabled: boolean
  interview_subject: string
  interview_template: string
  uses_company_defaults: boolean
  auto_replies_available?: boolean
}

export type EmployerApplicationDetail = {
  application_id: string
  job_id: string
  individual_id: string
  status: string
  applied_at: string
  message: string | null
  full_name: string
  email: string | null
  phone: string | null
  location: string | null
  has_cv: boolean
  cv_id: string | null
  chat_room_id: string | null
  note: string | null
  status_history: Array<{
    id: string
    old_status: string
    new_status: string
    changed_at: string
    changed_by: string | null
  }>
  auto_reply_log: Array<{
    target_status: string
    channel: string | null
    delivery_status: string
    subject: string | null
    sent_at: string
  }>
  cv: Record<string, unknown> | null
}

export type EmployerPrintListResponse = {
  job_title: string
  company_name: string
  generated_at: string
  items: Array<{
    application_id: string
    full_name: string
    email: string | null
    phone: string | null
    city: string | null
    applied_at: string
    availability: string | null
    salary_display: string | null
    top_skills: string[]
    internal_note: string | null
  }>
}
