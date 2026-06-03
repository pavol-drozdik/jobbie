import { Type } from 'class-transformer';

import {

  ArrayMaxSize,

  ArrayMinSize,

  IsArray,

  IsBoolean,

  IsIn,

  IsInt,

  IsOptional,

  IsString,

  IsUUID,

  Max,

  MaxLength,

  Min,

} from 'class-validator';

import {

  AUTO_REPLY_STATUS_TYPES,

  EMPLOYER_SETTABLE_STATUSES,

  type AutoReplyStatusType,

  type EmployerSettableStatus,

} from './applicant-status.constants';



export { AUTO_REPLY_STATUS_TYPES, type AutoReplyStatusType };

export type EmployerApplicationStatus = EmployerSettableStatus;



/** @deprecated use EMPLOYER_SETTABLE_STATUSES */

export const EMPLOYER_APPLICATION_STATUSES = EMPLOYER_SETTABLE_STATUSES;

/** @deprecated use AUTO_REPLY_STATUS_TYPES */

export const AUTO_MESSAGE_STATUS_TYPES = AUTO_REPLY_STATUS_TYPES;



export class EmployerApplicantStatusPatchDto {

  @IsString()

  @IsIn([...EMPLOYER_SETTABLE_STATUSES])

  status!: EmployerSettableStatus;



  @IsOptional()

  @IsBoolean()

  send_auto_reply?: boolean;



  @IsOptional()

  @IsBoolean()

  force_resend?: boolean;



  @IsOptional()

  @IsString()

  @MaxLength(500)

  note?: string;

}



export class EmployerApplicantsBulkStatusDto {

  @IsArray()

  @ArrayMinSize(1)

  @ArrayMaxSize(50)

  @IsUUID('4', { each: true })

  application_ids!: string[];



  @IsString()

  @IsIn([...EMPLOYER_SETTABLE_STATUSES])

  status!: EmployerSettableStatus;



  @IsOptional()

  @IsBoolean()

  send_auto_reply?: boolean;



  @IsOptional()

  @IsBoolean()

  force_resend?: boolean;

}



export class EmployerApplicantsQueryDto {

  @IsOptional()

  @IsString()

  @IsIn(['all', ...EMPLOYER_SETTABLE_STATUSES, 'withdrawn'])

  status?: string;



  @IsOptional()

  @IsString()

  @IsIn(['any', 'yes', 'no'])

  has_cv?: string;



  @IsOptional()

  @IsString()

  @IsIn([

    'applied_at_desc',

    'applied_at_asc',

    'experience_desc',

    'salary_asc',

    'name_asc',

  ])

  sort?: string;



  @IsOptional()

  @IsString()

  @MaxLength(200)

  q?: string;



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



export class EmployerJobsHubQueryDto {

  @IsOptional()

  @IsString()

  @MaxLength(200)

  q?: string;



  @IsOptional()

  @IsString()

  @IsIn(['all', 'published', 'draft', 'paused', 'expired', 'archived'])

  job_status?: string;



  @IsOptional()

  @IsString()

  @IsIn(['true', 'false'])

  has_new?: string;



  @IsOptional()

  @IsString()

  @IsIn([

    'last_application_desc',

    'applicants_desc',

    'published_desc',

    'expires_asc',

  ])

  sort?: string;



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



export interface ApplicantStatusCountsDto {

  pending: number;

  reviewing: number;

  interview_invited: number;

  rejected: number;

  accepted: number;

  withdrawn: number;

  total: number;

}



export interface EmployerJobHubItemDto {

  id: string;

  title: string;

  location: string | null;

  job_type: string | null;

  work_mode: string | null;

  listing_status: string;

  published_at: string;

  expires_at: string | null;

  applications_count: number;

  status_counts: ApplicantStatusCountsDto;

  last_application_at: string | null;

  has_new_applications: boolean;

}



export interface EmployerJobsHubResponseDto {

  items: EmployerJobHubItemDto[];

  total: number;

  offset: number;

  limit: number;

}



export interface EmployerApplicantRowDto {

  application_id: string;

  individual_id: string;

  status: string;

  applied_at: string;

  full_name: string;

  email: string | null;

  phone: string | null;

  location: string | null;

  has_cv: boolean;

  cv_id: string | null;

  uses_profile_cv: boolean;

  chat_room_id: string | null;

  message_preview: string | null;

  has_note: boolean;

  note_preview: string | null;

  photo_url: string | null;

  desired_position: string | null;

  experience_years: number | null;

  availability: string | null;

  salary_display: string | null;

  top_skills: string[];

  languages: string[];

  documents: string[];

}



export interface EmployerApplicantsListResponseDto {

  items: EmployerApplicantRowDto[];

  total: number;

  offset: number;

  limit: number;

  status_counts: ApplicantStatusCountsDto;

}



export class EmployerMessageTemplateUpsertDto {

  @IsString()

  @IsIn([...AUTO_REPLY_STATUS_TYPES, 'accepted'])

  status_type!: AutoReplyStatusType | 'accepted';



  @IsString()

  @MaxLength(8000)

  message_text!: string;



  @IsBoolean()

  enabled!: boolean;

}



export interface EmployerMessageTemplateDto {

  id: string;

  company_id: string;

  status_type: string;

  message_text: string;

  enabled: boolean;

  updated_at: string;

}



export class EmployerApplicationNoteDto {

  @IsString()

  @MaxLength(4000)

  note!: string;

}



export class EmployerJobReplySettingsDto {

  @IsOptional()

  @IsBoolean()

  rejection_auto_reply_enabled?: boolean;



  @IsOptional()

  @IsString()

  @MaxLength(200)

  rejection_subject?: string;



  @IsOptional()

  @IsString()

  @MaxLength(8000)

  rejection_template?: string;



  @IsOptional()

  @IsBoolean()

  interview_auto_reply_enabled?: boolean;



  @IsOptional()

  @IsString()

  @MaxLength(200)

  interview_subject?: string;



  @IsOptional()

  @IsString()

  @MaxLength(8000)

  interview_template?: string;

}



export interface EmployerJobReplySettingsResponseDto {

  job_id: string;

  company_id: string;

  rejection_auto_reply_enabled: boolean;

  rejection_subject: string;

  rejection_template: string;

  interview_auto_reply_enabled: boolean;

  interview_subject: string;

  interview_template: string;

  uses_company_defaults: boolean;

  /** False when subscription is not active Plus or Pro. */
  auto_replies_available?: boolean;

}



export interface ApplicationStatusHistoryItemDto {

  id: string;

  old_status: string;

  new_status: string;

  changed_at: string;

  changed_by: string | null;

}



export interface AutoReplyLogItemDto {

  target_status: string;

  channel: string | null;

  delivery_status: string;

  subject: string | null;

  sent_at: string;

}



export interface EmployerApplicationDetailDto {

  application_id: string;

  job_id: string;

  individual_id: string;

  status: string;

  applied_at: string;

  message: string | null;

  full_name: string;

  email: string | null;

  phone: string | null;

  location: string | null;

  has_cv: boolean;

  cv_id: string | null;

  chat_room_id: string | null;

  note: string | null;

  status_history: ApplicationStatusHistoryItemDto[];

  auto_reply_log: AutoReplyLogItemDto[];

  cv: Record<string, unknown> | null;

}



export interface EmployerPrintApplicantRowDto {

  application_id: string;

  full_name: string;

  email: string | null;

  phone: string | null;

  city: string | null;

  applied_at: string;

  availability: string | null;

  salary_display: string | null;

  top_skills: string[];

  internal_note: string | null;

}



export interface EmployerPrintListResponseDto {

  job_title: string;

  company_name: string;

  generated_at: string;

  items: EmployerPrintApplicantRowDto[];

}


