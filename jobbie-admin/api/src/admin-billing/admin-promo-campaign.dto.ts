import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCreatePromoCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.max_redemptions != null)
  @IsInt()
  @Min(1)
  max_redemptions?: number | null;

  @IsOptional()
  @IsISO8601()
  starts_at?: string | null;

  @IsOptional()
  @IsISO8601()
  ends_at?: string | null;

  @IsIn(['free_credits', 'credit_pack_discount', 'subscription_discount'])
  reward_type!: 'free_credits' | 'credit_pack_discount' | 'subscription_discount';

  @ValidateIf((o) => o.reward_type === 'free_credits')
  @IsInt()
  @Min(1)
  @Max(500)
  reward_credits?: number;

  @ValidateIf((o) => o.reward_type !== 'free_credits' && (o.discount_kind ?? 'percent') === 'percent')
  @IsInt()
  @Min(1)
  @Max(100)
  reward_percent?: number;

  @ValidateIf((o) => o.reward_type !== 'free_credits' && o.discount_kind === 'amount_off')
  @IsInt()
  @Min(1)
  @Max(50000)
  reward_amount_cents?: number;

  @ValidateIf((o) => o.reward_type !== 'free_credits')
  @IsIn(['percent', 'amount_off'])
  discount_kind?: 'percent' | 'amount_off';

  @IsOptional()
  @IsBoolean()
  reward_all_credit_packs?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reward_credit_pack_slugs?: string[];

  @IsOptional()
  @IsBoolean()
  reward_all_subscription_plans?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reward_subscription_plan_slugs?: string[];

  @ValidateIf((o) => o.reward_type === 'subscription_discount')
  @IsIn(['once', 'forever', 'repeating'])
  subscription_discount_duration?: 'once' | 'forever' | 'repeating';

  @ValidateIf(
    (o) =>
      o.reward_type === 'subscription_discount' &&
      o.subscription_discount_duration === 'repeating',
  )
  @IsInt()
  @Min(1)
  @Max(36)
  subscription_discount_duration_months?: number;

  @IsOptional()
  @IsIn(['shared', 'unique_pool'])
  code_mode?: 'shared' | 'unique_pool';

  @IsOptional()
  @IsBoolean()
  require_new_account?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  new_account_max_hours?: number;

  @IsOptional()
  @IsBoolean()
  require_first_publish?: boolean;

  @IsOptional()
  @IsBoolean()
  require_promo_code?: boolean;

  @IsOptional()
  @IsIn(['both', 'company', 'individual'])
  eligible_profile_role?: 'both' | 'company' | 'individual';

  @IsOptional()
  @IsBoolean()
  require_no_prior_subscription?: boolean;

  @IsOptional()
  @IsBoolean()
  require_no_published_offer?: boolean;
}

export class AdminSimulatePromoScenarioDto {
  @IsIn(['signup', 'first_publish', 'credit_checkout', 'subscription_checkout'])
  context!:
    | 'signup'
    | 'first_publish'
    | 'credit_checkout'
    | 'subscription_checkout';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(87600)
  account_age_hours?: number;

  @IsOptional()
  @IsBoolean()
  has_published?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pack_slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  plan_slug?: string;

  @IsOptional()
  @IsBoolean()
  already_redeemed?: boolean;

  @IsOptional()
  @IsIn(['company', 'individual'])
  profile_role?: 'company' | 'individual';

  @IsOptional()
  @IsBoolean()
  has_prior_subscription?: boolean;

  @IsOptional()
  @IsBoolean()
  pool_code_available?: boolean;
}

export class AdminSimulatePromoCampaignDto {
  @IsOptional()
  @IsString()
  campaign_id?: string;

  @IsOptional()
  campaign?: AdminCreatePromoCampaignDto;

  @ValidateNested()
  @Type(() => AdminSimulatePromoScenarioDto)
  scenario!: AdminSimulatePromoScenarioDto;
}

export class AdminUpdatePromoCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.max_redemptions != null)
  @IsInt()
  @Min(1)
  max_redemptions?: number | null;

  @IsOptional()
  @IsISO8601()
  starts_at?: string | null;

  @IsOptional()
  @IsISO8601()
  ends_at?: string | null;

  @IsOptional()
  @IsIn(['free_credits', 'credit_pack_discount', 'subscription_discount'])
  reward_type?: 'free_credits' | 'credit_pack_discount' | 'subscription_discount';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  reward_credits?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  reward_percent?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50000)
  reward_amount_cents?: number | null;

  @IsOptional()
  @IsIn(['percent', 'amount_off'])
  discount_kind?: 'percent' | 'amount_off' | null;

  @IsOptional()
  @IsBoolean()
  reward_all_credit_packs?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reward_credit_pack_slugs?: string[];

  @IsOptional()
  @IsBoolean()
  reward_all_subscription_plans?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reward_subscription_plan_slugs?: string[];

  @IsOptional()
  @IsIn(['once', 'forever', 'repeating'])
  subscription_discount_duration?: 'once' | 'forever' | 'repeating' | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  subscription_discount_duration_months?: number | null;

  @IsOptional()
  @IsIn(['shared', 'unique_pool'])
  code_mode?: 'shared' | 'unique_pool' | null;

  @IsOptional()
  @IsBoolean()
  require_new_account?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  new_account_max_hours?: number;

  @IsOptional()
  @IsBoolean()
  require_first_publish?: boolean;

  @IsOptional()
  @IsBoolean()
  require_promo_code?: boolean;

  @IsOptional()
  @IsIn(['both', 'company', 'individual'])
  eligible_profile_role?: 'both' | 'company' | 'individual' | null;

  @IsOptional()
  @IsBoolean()
  require_no_prior_subscription?: boolean;

  @IsOptional()
  @IsBoolean()
  require_no_published_offer?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class AdminPatchPoolCodeDto {
  @IsIn(['disabled', 'available'])
  status!: 'disabled' | 'available';
}

export class AdminGeneratePromoCodesDto {
  @IsInt()
  @Min(1)
  @Max(5000)
  count!: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  prefix?: string;
}
