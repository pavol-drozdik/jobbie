import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsIn,
  ValidateNested,
  MaxLength,
  ValidateIf,
  Equals,
} from 'class-validator';
import { SK_BILLING_INDIVIDUAL_MESSAGE } from './sk-billing-eligibility';
import { Type } from 'class-transformer';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return undefined;
}

export interface CreditPackDto {
  price_id: string;
  credits: number;
  unit_amount: number;
  currency: string;
  slug?: string;
  name_sk?: string;
  badge?: string | null;
}

const STRIPE_PRICE_ID_VALIDATION =
  'Vyberte platný balík kreditov (chýba Stripe Price ID v katalógu).';

/** Downgrade / activate the free (`zadarmo`) subscription plan — no Stripe checkout. */
export class ActivateFreePlanDto {
  @IsString()
  plan_id!: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  confirm_downgrade?: boolean;
}

export type SubscriptionBuyerType = 'individual' | 'company';

export class CheckoutBillingDetailsDto {
  @IsIn(['individual', 'company'])
  purchaser_type!: SubscriptionBuyerType;

  @IsOptional()
  @IsString()
  company_name?: string | null;

  @IsOptional()
  @IsString()
  registration_number?: string | null;

  @IsOptional()
  @IsString()
  tax_id?: string | null;

  @IsOptional()
  @IsString()
  vat_id?: string | null;

  @IsOptional()
  @IsString()
  address_line1?: string | null;

  @IsOptional()
  @IsString()
  address_line2?: string | null;

  @IsOptional()
  @IsString()
  address_city?: string | null;

  @IsOptional()
  @IsString()
  address_postal_code?: string | null;

  @IsOptional()
  @IsString()
  address_country?: string | null;

  @ValidateIf((o: CheckoutBillingDetailsDto) => o.purchaser_type === 'individual')
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  @Equals(true, { message: SK_BILLING_INDIVIDUAL_MESSAGE })
  billing_attestation_sk_residence?: boolean;
}

export class CreatePaymentIntentCreditsDto {
  @IsNotEmpty({ message: STRIPE_PRICE_ID_VALIDATION })
  @IsString({ message: STRIPE_PRICE_ID_VALIDATION })
  price_id!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutBillingDetailsDto)
  billing?: CheckoutBillingDetailsDto;
}

export class ConfirmCreditsPurchaseDto {
  @IsString()
  payment_intent_id!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutBillingDetailsDto)
  billing?: CheckoutBillingDetailsDto;
}

export class CreatePaymentIntentSubscriptionDto {
  @IsString()
  plan_id!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutBillingDetailsDto)
  billing?: CheckoutBillingDetailsDto;
}

export class ConfirmSubscriptionPurchaseDto {
  @ValidateIf((o: ConfirmSubscriptionPurchaseDto) => !o.setup_intent_id?.trim())
  @IsString()
  payment_intent_id?: string;

  @ValidateIf((o: ConfirmSubscriptionPurchaseDto) => !o.payment_intent_id?.trim())
  @IsString()
  setup_intent_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutBillingDetailsDto)
  billing?: CheckoutBillingDetailsDto;
}

export interface PaymentIntentResponseDto {
  client_secret: string;
  /** PaymentIntent amount in minor units (for Stripe `fetchUpdates` after tax). */
  amount?: number;
  currency?: string;
  intent_type?: 'payment' | 'setup';
  trial_period_days?: number;
}

/** Per-user subscription checkout trial (matches `createSubscriptionPaymentIntent`). */
export interface SubscriptionCheckoutPreviewDto {
  trial_period_days: number;
  intent_type: 'payment' | 'setup';
}

export const SUBSCRIPTION_CANCEL_REASON_CODES = [
  'too_expensive',
  'not_using',
  'missing_features',
  'found_alternative',
  'break',
  'other',
] as const;

export type SubscriptionCancelReasonCode =
  (typeof SUBSCRIPTION_CANCEL_REASON_CODES)[number];

export class CancelSubscriptionDto {
  @IsIn(SUBSCRIPTION_CANCEL_REASON_CODES, {
    message: 'Vyberte dôvod zrušenia predplatného.',
  })
  reason_code!: SubscriptionCancelReasonCode;

  @ValidateIf((o: CancelSubscriptionDto) => o.reason_code === 'other')
  @IsNotEmpty({ message: 'Krátke vysvetlenie je povinné pri voľbe „Iný dôvod“.' })
  @IsString()
  @MaxLength(500)
  reason_detail?: string | null;
}

export class ConfirmPaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  setup_intent_id!: string;
}
