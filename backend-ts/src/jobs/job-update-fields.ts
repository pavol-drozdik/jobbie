import type { JobOfferUpdateDto } from './jobs.dto';

/**
 * Allowlist of `job_offers` columns the owner is permitted to PATCH via
 * `PATCH /api/jobs/:job_id`. Keep in sync with `JobOfferUpdateDto`.
 *
 * Never include identity / system columns here (`id`, `company_id`,
 * `created_at`, `updated_at`, `is_deleted`, `is_foreign` post-creation,
 * `expired_at`, top-listing internals, etc.). `is_active` and `is_draft` are
 * exposed because publish/unpublish flows toggle them, but the controller
 * has additional checks before allowing those transitions.
 */
export const JOB_UPDATE_ALLOWED_FIELDS = [
  // basics
  'title',
  'description',
  'category',
  'job_type',
  'employment_types',
  'requirements',
  'requirements_text',
  'responsibilities',
  'offer_text',
  'skill_tags',
  // location
  'city',
  'postal_code',
  'location',
  'location_address',
  'location_lat',
  'location_lng',
  'show_exact_address',
  // work mode
  'work_mode',
  'work_modes',
  'work_from_home',
  // compensation
  'salary',
  'salary_type',
  'salary_min',
  'salary_max',
  'salary_negotiable',
  'compensation_type',
  'compensation_amount',
  // application
  'application_method',
  'contact_person',
  'contact_email',
  'contact_phone',
  'show_phone_publicly',
  'application_url',
  'application_deadline',
  'required_documents',
  // schedule / capacity
  'weekly_hours',
  'estimated_hours',
  'workers_needed',
  'expires_at',
  'completion_deadline',
  'contract_type',
  'required_experience',
  'own_car_required',
  // misc
  'photos',
  'is_urgent',
  'education_levels',
  'benefits',
  'suitable_for',
  'driver_licenses',
  'work_shift_modes',
  'languages',
  'pc_skills',
  'start_type',
  'start_date',
  // publish state — controller validates the transition separately
  'is_active',
  'is_draft',
] as const satisfies readonly (keyof JobOfferUpdateDto)[];

const JOB_UPDATE_ALLOWED_SET = new Set<string>(JOB_UPDATE_ALLOWED_FIELDS);

/**
 * Returns a shallow copy of `body` containing only keys present in the
 * allowlist. Stops mass assignment of identity, billing, or system fields
 * even if a DTO is later extended to include them (e.g. `is_foreign` is in
 * the DTO for create but must not flow through PATCH).
 */
export function pickJobUpdateFields(
  body: JobOfferUpdateDto,
): Partial<JobOfferUpdateDto> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(body) as Array<keyof JobOfferUpdateDto>) {
    if (!JOB_UPDATE_ALLOWED_SET.has(key as string)) continue;
    const value = (body as Record<string, unknown>)[key as string];
    if (value === undefined) continue;
    out[key as string] = value;
  }
  return out as Partial<JobOfferUpdateDto>;
}
