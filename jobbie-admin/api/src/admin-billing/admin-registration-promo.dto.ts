import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class AdminUpdateRegistrationPromoCampaignDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  credits_amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_redemptions?: number;

  @IsOptional()
  @IsISO8601()
  starts_at?: string | null;

  @IsOptional()
  @IsISO8601()
  ends_at?: string | null;
}
