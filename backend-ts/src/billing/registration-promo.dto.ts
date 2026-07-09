import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrationPromoValidateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;
}

export class RegistrationPromoRedeemDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  /** When true and code is omitted, resolve code from auth user metadata (signup email-confirm path). */
  @IsOptional()
  @IsBoolean()
  use_metadata_fallback?: boolean;
}
