import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsInt,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  IsIn,
  ValidateNested,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  JOB_APPLICATION_METHODS,
  JOB_EMPLOYMENT_TYPES,
  JOB_REQUIRED_DOCUMENTS,
  JOB_REQUIRED_EXPERIENCE,
  JOB_SALARY_TYPES,
  JOB_WORK_MODES,
} from './job-offer.constants';
import { JOB_CATEGORY_SLUGS } from '../common/job-categories.constants';

export class JobLanguageRequirementDto {
  @IsInt()
  @Min(1)
  language_id!: number;

  @IsString()
  @IsIn(['undefined', 'elementary', 'intermediate', 'master'])
  level!: string;
}

export class JobPcSkillRequirementDto {
  @IsInt()
  @Min(1)
  skill_id!: number;

  @IsString()
  @IsIn(['undefined', 'elementary', 'intermediate', 'master'])
  level!: string;
}

/** Base44-style job response (Supabase job_offers + base44 fields). */
export interface JobOfferResponseDto {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  contract_type: string | null;
  requirements: string | null;
  salary: string | null;
  job_type: string | null;
  work_mode: string | null;
  expires_at: string | null;
  is_draft: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Base44
  category: string | null;
  is_urgent: boolean;
  is_featured: boolean;
  compensation_type: string | null;
  compensation_amount: number | null;
  workers_needed: number;
  application_deadline: string | null;
  completion_deadline: string | null;
  employer_email: string | null;
  employer_name: string | null;
  photos: string[];
  applications_count: number;
  // Worki-style extended attributes
  work_from_home: boolean;
  salary_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  education_levels: number[];
  benefits: number[];
  suitable_for: number[];
  driver_licenses: number[];
  work_shift_modes: number[];
  languages: Array<{ language_id: number; level: string }>;
  pc_skills: Array<{ skill_id: number; level: string }>;
  start_type: string | null;
  start_date: string | null;
  employment_types: string[];
  work_modes: string[];
  city: string | null;
  postal_code: string | null;
  show_exact_address: boolean;
  salary_negotiable: boolean;
  required_experience: string | null;
  weekly_hours: number | null;
  estimated_hours: number | null;
  own_car_required: boolean;
  application_method: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  show_phone_publicly: boolean;
  application_url: string | null;
  required_documents: string[];
  responsibilities: string | null;
  requirements_text: string | null;
  offer_text: string | null;
  skill_tags: string[];
  is_foreign: boolean;
  /** True when an active paid `top_category` promotion is active (7 days). */
  show_top_badge?: boolean;
}

/** Shared structured fields for create/update DTOs. */
abstract class JobOfferStructuredFieldsDto {
  @IsOptional()
  @IsBoolean()
  is_foreign?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn([...JOB_EMPLOYMENT_TYPES], { each: true })
  employment_types?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn([...JOB_WORK_MODES], { each: true })
  work_modes?: string[];

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  postal_code?: string | null;

  @IsOptional()
  @IsBoolean()
  show_exact_address?: boolean;

  @IsOptional()
  @IsBoolean()
  salary_negotiable?: boolean;

  @IsOptional()
  @IsString()
  @IsIn([...JOB_REQUIRED_EXPERIENCE])
  required_experience?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weekly_hours?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_hours?: number | null;

  @IsOptional()
  @IsBoolean()
  own_car_required?: boolean;

  @IsOptional()
  @IsString()
  @IsIn([...JOB_APPLICATION_METHODS])
  application_method?: string | null;

  @IsOptional()
  @IsString()
  contact_person?: string | null;

  @IsOptional()
  @IsString()
  contact_email?: string | null;

  @IsOptional()
  @IsString()
  contact_phone?: string | null;

  @IsOptional()
  @IsBoolean()
  show_phone_publicly?: boolean;

  @IsOptional()
  @IsString()
  application_url?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsIn([...JOB_REQUIRED_DOCUMENTS], { each: true })
  required_documents?: string[];

  @IsOptional()
  @IsString()
  responsibilities?: string | null;

  @IsOptional()
  @IsString()
  requirements_text?: string | null;

  @IsOptional()
  @IsString()
  offer_text?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  skill_tags?: string[];
}

/** Minimal fields broadcast on Socket.IO when a job becomes public (home feed). */
export type JobPublishedSocketPayload = Pick<
  JobOfferResponseDto,
  | 'id'
  | 'title'
  | 'category'
  | 'location'
  | 'location_address'
  | 'created_at'
  | 'salary'
  | 'compensation_type'
  | 'compensation_amount'
  | 'is_urgent'
  | 'job_type'
>;

export function toJobPublishedSocketPayload(
  dto: JobOfferResponseDto,
): JobPublishedSocketPayload {
  return {
    id: dto.id,
    title: dto.title,
    category: dto.category,
    location: dto.location,
    location_address: dto.location_address,
    created_at: dto.created_at,
    salary: dto.salary,
    compensation_type: dto.compensation_type,
    compensation_amount: dto.compensation_amount,
    is_urgent: dto.is_urgent,
    job_type: dto.job_type,
  };
}

export class JobOfferCreateDto extends JobOfferStructuredFieldsDto {
  @IsOptional()
  @ValidateIf((o: JobOfferCreateDto) => o.is_draft !== true)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @ValidateIf((o: JobOfferCreateDto) => o.is_draft !== true)
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  location_address?: string | null;

  @IsOptional()
  @IsNumber()
  location_lat?: number | null;

  @IsOptional()
  @IsNumber()
  location_lng?: number | null;

  @IsOptional()
  @IsString()
  contract_type?: string | null;

  @IsOptional()
  @IsString()
  requirements?: string | null;

  @IsOptional()
  @IsString()
  salary?: string | null;

  @IsOptional()
  @IsString()
  job_type?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['on_site', 'hybrid', 'remote'])
  work_mode?: string | null;

  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @IsOptional()
  @IsDateString()
  application_deadline?: string | null;

  @IsOptional()
  @IsString()
  completion_deadline?: string | null;

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsIn([...JOB_CATEGORY_SLUGS])
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  @IsOptional()
  @IsBoolean()
  want_top_listing?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsString()
  compensation_type?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compensation_amount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  workers_needed?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsBoolean()
  work_from_home?: boolean;

  @IsOptional()
  @IsString()
  @IsIn([...JOB_SALARY_TYPES])
  salary_type?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary_min?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary_max?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  education_levels?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsInt({ each: true })
  benefits?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  suitable_for?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  driver_licenses?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  work_shift_modes?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => JobLanguageRequirementDto)
  languages?: JobLanguageRequirementDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => JobPcSkillRequirementDto)
  pc_skills?: JobPcSkillRequirementDto[];

  @IsOptional()
  @IsString()
  @IsIn(['asap', 'by_agreement', 'date'])
  start_type?: string | null;

  @IsOptional()
  @IsDateString()
  start_date?: string | null;
}

export class JobOfferUpdateDto extends JobOfferStructuredFieldsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  location_address?: string | null;

  @IsOptional()
  @IsNumber()
  location_lat?: number | null;

  @IsOptional()
  @IsNumber()
  location_lng?: number | null;

  @IsOptional()
  @IsString()
  contract_type?: string | null;

  @IsOptional()
  @IsString()
  requirements?: string | null;

  @IsOptional()
  @IsString()
  salary?: string | null;

  @IsOptional()
  @IsString()
  job_type?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['on_site', 'hybrid', 'remote'])
  work_mode?: string | null;

  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @IsOptional()
  @IsDateString()
  application_deadline?: string | null;

  @IsOptional()
  @IsString()
  completion_deadline?: string | null;

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsIn([...JOB_CATEGORY_SLUGS])
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  @IsOptional()
  @IsBoolean()
  want_top_listing?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsString()
  compensation_type?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compensation_amount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  workers_needed?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsBoolean()
  work_from_home?: boolean;

  @IsOptional()
  @IsString()
  @IsIn([...JOB_SALARY_TYPES])
  salary_type?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary_min?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary_max?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  education_levels?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsInt({ each: true })
  benefits?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  suitable_for?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  driver_licenses?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  work_shift_modes?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => JobLanguageRequirementDto)
  languages?: JobLanguageRequirementDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => JobPcSkillRequirementDto)
  pc_skills?: JobPcSkillRequirementDto[];

  @IsOptional()
  @IsString()
  @IsIn(['asap', 'by_agreement', 'date'])
  start_type?: string | null;

  @IsOptional()
  @IsDateString()
  start_date?: string | null;
}
