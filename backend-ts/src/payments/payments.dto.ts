import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export interface CreditPackDto {
  price_id: string;
  credits: number;
  unit_amount: number;
  currency: string;
}

export class CreateCreditsCheckoutDto {
  @IsOptional()
  @IsString()
  price_id?: string;

  @IsNumber()
  @Min(1)
  credits_amount!: number;

  @IsOptional()
  @IsString()
  success_url?: string;

  @IsOptional()
  @IsString()
  cancel_url?: string;
}

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

export class CreatePaymentIntentCreditsDto {
  @IsOptional()
  @IsString()
  price_id?: string;

  @IsNumber()
  @Min(1)
  credits_amount!: number;
}

export class CreatePaymentIntentJobDto {
  @IsString()
  job_id!: string;
}

export interface PaymentIntentResponseDto {
  client_secret: string;
}
