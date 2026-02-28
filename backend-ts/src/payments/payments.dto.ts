import { IsString, IsOptional } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  job_id!: string;

  @IsOptional()
  @IsString()
  success_url?: string;

  @IsOptional()
  @IsString()
  cancel_url?: string;
}

export class CreateSubscriptionCheckoutDto {
  @IsString()
  plan_id!: string;

  @IsOptional()
  @IsString()
  success_url?: string;

  @IsOptional()
  @IsString()
  cancel_url?: string;
}

export interface CreateCheckoutSessionResponseDto {
  checkout_url: string;
  session_id: string;
}
