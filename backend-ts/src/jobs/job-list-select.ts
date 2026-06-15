/**
 * Explicit column lists for job catalog/list/search hydrate.
 * Detail routes (`GET /api/jobs/:id`) still use full rows.
 */

/** Public/authenticated job cards — omits large HTML blobs. */
export const JOB_CARD_LIST_SELECT =
  'id, company_id, title, location, location_address, location_lat, location_lng, contract_type, salary, job_type, work_mode, expires_at, is_draft, is_active, created_at, updated_at, category, is_urgent, is_featured, compensation_type, compensation_amount, workers_needed, application_deadline, completion_deadline, employer_email, employer_name, photos, applications_count, work_from_home, salary_type, salary_min, salary_max, education_levels, benefits, suitable_for, driver_licenses, work_shift_modes, languages, pc_skills, start_type, start_date, employment_types, work_modes, city, postal_code, show_exact_address, salary_negotiable, required_experience, weekly_hours, estimated_hours, own_car_required, application_method, contact_person, contact_email, contact_phone, show_phone_publicly, application_url, required_documents, skill_tags, is_foreign, is_deleted';

/**
 * Optional `description` for in-memory text filter when both `q` and `location` are set.
 * Stripped from list API responses — not returned to clients.
 */
export const JOB_LIST_MEMORY_FILTER_SELECT = `${JOB_CARD_LIST_SELECT},description`;

/** Typesense / recommended / similar hydrate. */
export const JOB_SEARCH_HYDRATE_SELECT = JOB_CARD_LIST_SELECT;

/** @deprecated use JOB_CARD_LIST_SELECT */
export const JOB_LIST_SELECT = JOB_SEARCH_HYDRATE_SELECT;
