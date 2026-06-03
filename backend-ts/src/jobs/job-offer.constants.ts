export const JOB_EMPLOYMENT_TYPES = [
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
] as const;

export const JOB_WORK_MODES = ['on_site', 'hybrid', 'remote'] as const;

export const JOB_SALARY_TYPES = [
  'monthly',
  'hourly',
  'one_time',
  'task_based',
  'negotiable',
] as const;

export const JOB_REQUIRED_EXPERIENCE = [
  'any',
  'none',
  'lt1',
  'y1_2',
  'y3_5',
  'y6_plus',
] as const;

export const JOB_APPLICATION_METHODS = [
  'platform',
  'email',
  'phone',
  'external',
] as const;

export const JOB_REQUIRED_DOCUMENTS = [
  'cv',
  'cover_letter',
  'portfolio',
  'certificate',
  'none',
] as const;

export type JobPublishInput = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  job_type?: string | null;
  employment_types?: string[] | null;
  work_modes?: string[] | null;
  work_mode?: string | null;
  city?: string | null;
  location?: string | null;
  location_address?: string | null;
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_negotiable?: boolean | null;
  application_method?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  application_url?: string | null;
  application_deadline?: string | null;
  required_documents?: string[] | null;
  weekly_hours?: number | null;
  estimated_hours?: number | null;
  workers_needed?: number | null;
  requirements?: string | null;
};
