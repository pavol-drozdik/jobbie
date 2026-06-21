import {
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

export class RecordCookieConsentDto {
  @IsUUID()
  visitor_id!: string;

  @IsIn(['accept_all', 'reject_all', 'save', 'withdraw'])
  action!: 'accept_all' | 'reject_all' | 'save' | 'withdraw';

  @IsIn(['banner', 'preferences', 'footer'])
  source!: 'banner' | 'preferences' | 'footer';

  @IsBoolean()
  analytics!: boolean;

  @IsBoolean()
  marketing!: boolean;

  @IsBoolean()
  personalization!: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  policy_version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  page_path?: string;
}
