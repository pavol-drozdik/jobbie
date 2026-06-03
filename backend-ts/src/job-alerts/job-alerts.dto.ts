import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  hasAtLeastOneSearchCriterion,
  JOB_ALERT_RADIUS_VALUES,
} from './job-alerts-matching.util';
import { JOB_CATEGORY_SLUGS } from '../common/job-categories.constants';

export const JOB_ALERT_EMPLOYMENT_TYPES = [
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
] as const;

export const JOB_ALERT_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'immediate',
] as const;

export const JOB_ALERT_WORK_MODES = ['on_site', 'hybrid', 'remote'] as const;

export const JOB_ALERT_SALARY_TYPES = ['monthly', 'hourly'] as const;

export const JOB_ALERT_START_TYPES = ['asap', 'by_agreement'] as const;

export const JOB_ALERT_LANGUAGE_LEVELS = [
  'undefined',
  'elementary',
  'intermediate',
  'master',
] as const;

export const JOB_ALERT_PC_SKILL_LEVELS = JOB_ALERT_LANGUAGE_LEVELS;

export class JobAlertLanguageFilterDto {
  @IsInt()
  @Min(1)
  language_id!: number;

  @IsString()
  @IsIn([...JOB_ALERT_LANGUAGE_LEVELS])
  level!: string;
}

export class JobAlertPcSkillFilterDto {
  @IsInt()
  @Min(1)
  skill_id!: number;

  @IsString()
  @IsIn([...JOB_ALERT_PC_SKILL_LEVELS])
  level!: string;
}

@ValidatorConstraint({ name: 'jobAlertHasCriteria', async: false })
export class JobAlertHasCriteriaConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    return hasAtLeastOneSearchCriterion(
      args.object as Record<string, unknown>,
    );
  }

  defaultMessage(): string {
    return 'Vyberte aspoň jedno kritérium okrem názvu.';
  }
}

/** Shared fragment used by all three (create / update / preview) DTOs to keep validators in sync. */
class JobAlertCriteriaBaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  keywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @IsIn([...JOB_ALERT_RADIUS_VALUES])
  radius_km?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(64)
  @IsIn([...JOB_CATEGORY_SLUGS])
  category?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @IsIn([...JOB_CATEGORY_SLUGS], { each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @IsString({ each: true })
  @IsIn([...JOB_ALERT_EMPLOYMENT_TYPES], { each: true })
  employment_types?: string[];

  @IsOptional()
  @IsString()
  @IsIn([...JOB_ALERT_SALARY_TYPES])
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
  @IsString()
  @IsIn([...JOB_ALERT_WORK_MODES])
  work_mode?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @IsIn([...JOB_ALERT_WORK_MODES], { each: true })
  work_modes?: string[];

  @IsOptional()
  @IsBoolean()
  work_from_home?: boolean;

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
  @Type(() => JobAlertLanguageFilterDto)
  language_filters?: JobAlertLanguageFilterDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => JobAlertPcSkillFilterDto)
  pc_skill_filters?: JobAlertPcSkillFilterDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @IsIn([...JOB_ALERT_START_TYPES], { each: true })
  start_types?: string[];

  @IsOptional()
  @IsDateString()
  start_date_from?: string | null;

  @IsOptional()
  @IsBoolean()
  newsletter?: boolean;
}

export class CreateJobEmailAlertDto extends JobAlertCriteriaBaseDto {
  @Validate(JobAlertHasCriteriaConstraint)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn([...JOB_ALERT_FREQUENCIES])
  frequency!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/** Criteria-only body for preview-count (all fields optional). */
export class JobAlertPreviewCriteriaDto extends JobAlertCriteriaBaseDto {}

export class UpdateJobEmailAlertDto extends JobAlertCriteriaBaseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn([...JOB_ALERT_FREQUENCIES])
  frequency?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export interface JobEmailAlertResponseDto {
  id: string;
  user_id: string;
  name: string;
  keywords: string;
  location: string;
  radius_km: number | null;
  category: string | null;
  categories: string[];
  employment_types: string[];
  salary_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  work_mode: string | null;
  work_modes: string[];
  work_from_home: boolean;
  education_levels: number[];
  benefits: number[];
  suitable_for: number[];
  driver_licenses: number[];
  work_shift_modes: number[];
  language_filters: Array<{ language_id: number; level: string }>;
  pc_skill_filters: Array<{ skill_id: number; level: string }>;
  start_types: string[];
  start_date_from: string | null;
  newsletter: boolean;
  frequency: string;
  is_active: boolean;
  criteria_hash: string;
  last_dispatch_at: string | null;
  created_at: string;
  updated_at: string;
}
