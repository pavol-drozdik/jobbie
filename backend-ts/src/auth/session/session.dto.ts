import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MinLength(20)
  access_token!: string;

  /** Supabase refresh tokens are short opaque strings (often ~12 chars), not JWTs. */
  @IsString()
  @MinLength(8)
  refresh_token!: string;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;
}

export class StepUpSessionDto {
  @IsString()
  @MinLength(20)
  access_token!: string;
}
