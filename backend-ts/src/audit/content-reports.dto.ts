import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
