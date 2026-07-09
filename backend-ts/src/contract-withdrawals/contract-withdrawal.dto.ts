import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const PRODUCT_IDS = ['subscription', 'credits'] as const;

const REASON_IDS = ['changed_mind', 'no_longer_needed', 'other'] as const;

/** Body for POST /api/contract-withdrawals (public consumer withdrawal form). */
export class ContractWithdrawalDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsIn([...PRODUCT_IDS])
  product!: (typeof PRODUCT_IDS)[number];

  @IsString()
  @MaxLength(80)
  invoice_number!: string;

  @IsDateString({ strict: true })
  purchase_date!: string;

  @IsOptional()
  @IsIn([...REASON_IDS])
  reason?: (typeof REASON_IDS)[number];

  @ValidateIf((dto: ContractWithdrawalDto) => dto.reason === 'other')
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason_other?: string;

  @IsBoolean()
  @Equals(true, { message: 'withdrawal_ack must be true' })
  withdrawal_ack!: boolean;
}
