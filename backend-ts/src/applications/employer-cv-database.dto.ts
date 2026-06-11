import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export function splitCommaList(value: string | undefined): string[] {
  if (!value || typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Coerce repeated query params + CSV legacy fallback into a string[]. */
function toStringArray(value: unknown): string[] {
  if (value === undefined || value === null || value === '') {
    return [];
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const v of value) {
      if (typeof v === 'string') {
        for (const part of v.split(',')) {
          const t = part.trim();
          if (t) out.push(t);
        }
      } else if (typeof v === 'number') {
        out.push(String(v));
      }
    }
    return out;
  }
  if (typeof value === 'string') {
    return splitCommaList(value);
  }
  return [];
}

const JOB_TYPES = [
  'full_time',
  'part_time',
  'brigada',
  'internship',
  'one_off',
  /** @deprecated legacy URLs */
  'agreement',
  'self_employed',
];
const EXPERIENCE = ['none', 'lt1', '1_2', '3_5', '6_10', '10p'];
const AVAILABILITY = [
  'immediately',
  'by_agreement',
  'within_1_month',
  'within_2_months',
  'within_3_months',
];
const RADIUS = ['exact', '10', '25', '50', '100', 'sk'];
const EDU_LEVEL = [
  'basic',
  'secondary',
  'secondary_with_graduation',
  'university_bc',
  'university_mgr',
  'university_phd',
  'course',
];
const TRISTATE = ['any', 'yes', 'no'];
const LAST_ACTIVE = ['today', '7d', '30d', '3m'];
const LAST_UPDATED = ['7d', '30d', '3m', '6m', '12m'];
const STATUS = ['actively_looking', 'open', 'not_looking'];
const GENDER = ['male', 'female', 'other'];
const SORT = [
  'best_match',
  'last_active',
  'last_updated',
  'salary_asc',
  'experience_desc',
  // Legacy values kept for backward compatibility with old shared URLs:
  'newest',
  'relevance',
  'name',
];

export class EmployerCvDatabaseQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** Free-text city / region. Falls back to legacy `city` if `location` not sent. */
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @IsIn(RADIUS)
  radius?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @IsIn(JOB_TYPES, { each: true })
  jobTypes?: string[];

  @IsOptional()
  @IsString()
  desired_position?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  @IsIn(EXPERIENCE)
  experience?: string;

  @IsOptional()
  @IsString()
  @IsIn(AVAILABILITY)
  availability?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMax?: number;

  /** Legacy salary param accepted for backward compat. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salary_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salary_max?: number;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  /** Compact mapping "en:B2,de:A2". */
  @IsOptional()
  @IsString()
  languageLevels?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  soft_skills?: string[];

  @IsOptional()
  @IsString()
  @IsIn(EDU_LEVEL)
  educationLevel?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @IsOptional()
  @IsBooleanString()
  hasCertificate?: string;

  @IsOptional()
  @IsString()
  certificate?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  employer?: string;

  @IsOptional()
  @IsBooleanString()
  currentlyEmployed?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  drivingLicences?: string[];

  @IsOptional()
  @IsString()
  driving_license?: string;

  @IsOptional()
  @IsString()
  @IsIn(TRISTATE)
  weekendWork?: string;

  @IsOptional()
  @IsString()
  @IsIn(TRISTATE)
  nightWork?: string;

  @IsOptional()
  @IsString()
  @IsIn(LAST_ACTIVE)
  lastActive?: string;

  @IsOptional()
  @IsString()
  @IsIn(LAST_UPDATED)
  lastUpdated?: string;

  @IsOptional()
  @IsString()
  @IsIn(STATUS)
  candidateStatus?: string;

  @IsOptional()
  @IsBooleanString()
  hasPhoto?: string;

  @IsOptional()
  @IsBooleanString()
  completedCv?: string;

  @IsOptional()
  @IsBooleanString()
  hasSummary?: string;

  @IsOptional()
  @IsBooleanString()
  hasExperience?: string;

  @IsOptional()
  @IsBooleanString()
  hasEducation?: string;

  @IsOptional()
  @IsBooleanString()
  hasSkills?: string;

  @IsOptional()
  @IsBooleanString()
  hasLanguages?: string;

  @IsOptional()
  @IsBooleanString()
  canReceiveOffers?: string;

  @IsOptional()
  @IsBooleanString()
  hasPhone?: string;

  @IsOptional()
  @IsBooleanString()
  hasEmail?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  ageMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  ageMax?: number;

  @IsOptional()
  @IsString()
  @IsIn(GENDER)
  gender?: string;

  // Legacy fields (kept for old URLs / clients).
  @IsOptional()
  @IsString()
  employment_types?: string;

  @IsOptional()
  @IsString()
  updated_after?: string;

  @IsOptional()
  @IsString()
  updated_before?: string;

  @IsOptional()
  @IsString()
  education_q?: string;

  @IsOptional()
  @IsString()
  highest_education_level?: string;

  @IsOptional()
  @IsString()
  @IsIn(SORT)
  sort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class EmployerCvDatabaseOpenChatBodyDto {
  @IsOptional()
  @IsUUID()
  application_id?: string;
}

export interface EmployerCvDatabaseListItemDto {
  cv_id: string;
  candidate_display_name: string;
  avatar_url: string | null;
  location: string | null;
  desired_positions: string[];
  employment_types: string[];
  start_availability: string | null;
  salary_min: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  top_skills: string[];
  languages: { language: string; level: string | null }[];
  latest_experience: {
    position: string;
    company: string;
    current: boolean;
    start_date: string | null;
    end_date: string | null;
  } | null;
  /** Whole years of work experience, derived from cv_experience. */
  years_of_experience: number | null;
  updated_at: string;
  /** One-line school · field/degree for list cards (highest / most recent education). */
  education_summary: string | null;
  /** Employer may see contact fields (candidate opt-in or cv_contact_unlocks). */
  contacts_visible: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  /** Locked CV with e-mail, phone, or LinkedIn on file — employer may unlock. */
  has_contact_to_unlock: boolean;
}

export interface EmployerCvDatabaseListResponseDto {
  items: EmployerCvDatabaseListItemDto[];
  total: number;
  offset: number;
  limit: number;
  /** When true, total counts only rows scanned within the server cap (see service). */
  total_is_partial?: boolean;
}

export interface EmployerCvDatabaseOpenChatApplicationDto {
  id: string;
  job_title: string | null;
  status: string;
}

export type EmployerCvDatabaseOpenChatResponseDto =
  | { room_id: string }
  | { applications: EmployerCvDatabaseOpenChatApplicationDto[] };
