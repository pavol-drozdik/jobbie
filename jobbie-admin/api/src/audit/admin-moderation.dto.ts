import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RecordModerationDecisionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  subject_type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  subject_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  decision!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class ModerationActionDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export const REPORT_RESOLUTION_CODES = [
  'spam',
  'harassment',
  'duplicate',
  'false_report',
  'other',
] as const;

export type ReportResolutionCode = (typeof REPORT_RESOLUTION_CODES)[number];

export class DismissReportDto {
  @IsOptional()
  @IsIn(REPORT_RESOLUTION_CODES)
  resolution_code?: ReportResolutionCode;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreateContentReportDto {
  @IsIn([
    'job_offer',
    'company_profile',
    'company_ad',
    'banner_ad',
    'company_review',
    'chat_message',
  ])
  target_type!:
    | 'job_offer'
    | 'company_profile'
    | 'company_ad'
    | 'banner_ad'
    | 'company_review'
    | 'chat_message';

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  target_id!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}
