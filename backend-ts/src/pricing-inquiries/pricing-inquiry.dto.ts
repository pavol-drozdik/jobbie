import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const SERVICE_IDS = [
  'homepage_banner',
  'job_list_banner',
  'job_list_mini_banner',
  'top_employers_logo',
  'pr_article',
  'mailing',
  'other',
] as const;

/** Body for POST /api/pricing-inquiries (public sales contact form). */
export class PricingInquiryDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(200)
  company!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsIn([...SERVICE_IDS])
  service_id!: (typeof SERVICE_IDS)[number];

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsBoolean()
  @Equals(true, { message: 'consent must be true' })
  consent!: boolean;
}
