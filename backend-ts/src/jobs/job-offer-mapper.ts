import type { JobOfferCreateDto, JobOfferUpdateDto } from './jobs.dto';
import {
  deriveLegacyCompensation,
  formatJobSalaryDisplay,
  resolveWorkModeFromModes,
  workFromHomeFromModes,
} from './job-offer-salary.util';
import { sanitizeRequiredDocuments } from './job-offer-publish.validation';
import { sanitizeRichTextHtml } from '../common/sanitize-html.util';
import { parseOptionalMoneyAmount } from '../common/money-amount.util';

type Body = JobOfferCreateDto | JobOfferUpdateDto;

export function buildJobOfferRowFromBody(
  body: Body,
  extras: {
    company_id: string;
    employer_email: string | null;
    employer_name: string | null;
    is_draft: boolean;
  },
): Record<string, unknown> {
  const workModes = body.work_modes ?? [];
  const workMode = resolveWorkModeFromModes(workModes, body.work_mode);
  const salaryDisplay = formatJobSalaryDisplay({
    salary_type: body.salary_type,
    salary_min: body.salary_min,
    salary_max: body.salary_max,
    salary_negotiable: body.salary_negotiable,
  });
  const legacy = deriveLegacyCompensation({
    salary_type: body.salary_type,
    salary_min: body.salary_min,
    salary_max: body.salary_max,
    salary_negotiable: body.salary_negotiable,
  });

  const skillTagsFromBody = (body.skill_tags ?? []).filter(
    (t) => typeof t === 'string' && t.trim().length > 0,
  );

  return {
    company_id: extras.company_id,
    title: body.title ?? '',
    description: sanitizeRichTextHtml(body.description ?? ''),
    location: body.location ?? body.location_address ?? null,
    location_address: body.location_address ?? body.location ?? null,
    location_lat: body.location_lat ?? null,
    location_lng: body.location_lng ?? null,
    contract_type: body.contract_type ?? null,
    requirements: body.requirements ?? null,
    salary: body.salary ?? salaryDisplay,
    job_type: body.job_type ?? null,
    work_mode: workMode,
    work_modes: workModes,
    expires_at: body.expires_at ?? null,
    application_deadline: body.application_deadline ?? null,
    completion_deadline: body.completion_deadline ?? null,
    is_draft: extras.is_draft,
    is_active: !extras.is_draft,
    category: body.category ?? null,
    is_urgent: body.is_urgent ?? false,
    is_featured: body.is_featured ?? false,
    compensation_type: body.compensation_type ?? legacy.compensation_type,
    compensation_amount:
      parseOptionalMoneyAmount(
        body.compensation_amount ?? legacy.compensation_amount,
      ),
    workers_needed: body.workers_needed ?? 1,
    employer_email: extras.employer_email,
    employer_name: extras.employer_name,
    photos: body.photos ?? [],
    work_from_home:
      body.work_from_home ?? workFromHomeFromModes(workModes),
    salary_type: body.salary_type ?? null,
    salary_min: parseOptionalMoneyAmount(body.salary_min),
    salary_max: parseOptionalMoneyAmount(body.salary_max),
    salary_negotiable: body.salary_negotiable ?? false,
    education_levels: body.education_levels ?? [],
    benefits: body.benefits ?? [],
    suitable_for: body.suitable_for ?? [],
    driver_licenses: body.driver_licenses ?? [],
    work_shift_modes: body.work_shift_modes ?? [],
    languages: body.languages ?? [],
    pc_skills: body.pc_skills ?? [],
    start_type: body.start_type ?? null,
    start_date: body.start_date ?? null,
    employment_types: body.employment_types ?? [],
    city: body.city ?? null,
    postal_code: body.postal_code ?? null,
    show_exact_address: body.show_exact_address ?? false,
    required_experience: body.required_experience ?? null,
    weekly_hours: body.weekly_hours ?? null,
    estimated_hours: body.estimated_hours ?? null,
    own_car_required: body.own_car_required ?? false,
    application_method: body.application_method ?? 'platform',
    contact_person: body.contact_person ?? null,
    contact_email: body.contact_email ?? null,
    contact_phone: body.contact_phone ?? null,
    show_phone_publicly: body.show_phone_publicly ?? false,
    application_url: body.application_url ?? null,
    required_documents: sanitizeRequiredDocuments(body.required_documents),
    responsibilities: body.responsibilities ?? null,
    requirements_text: body.requirements_text ?? null,
    offer_text: body.offer_text ?? null,
    skill_tags: skillTagsFromBody.map((t) => t.trim()),
    ...(body.is_foreign !== undefined
      ? { is_foreign: Boolean(body.is_foreign) }
      : {}),
  };
}
