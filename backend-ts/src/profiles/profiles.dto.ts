import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsNumber,
  IsObject,
  IsUUID,
} from 'class-validator';
import type { MySubscriptionResponseDto } from '../plans/plans.dto';

/** Full row returned from PATCH/GET me (internal + PWA settings). */
export interface ProfileResponseDto {
  id: string;
  role: string;
  app_role: string;
  extra_permission_scopes: string[];
  phone_e164: string | null;
  phone_verified_at: string | null;
  display_name: string | null;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  registered_office: string | null;
  tax_id: string | null;
  vat_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  skills: string | null;
  job_interests: string | null;
  location: string | null;
  description: string | null;
  sector: string | null;
  experience: string | null;
  registration_number: string | null;
  website: string | null;
  logo_url: string | null;
  credits: number;
  customer_role: boolean;
  worker_role: boolean;
  provider_role: boolean;
  created_at?: string | null;
  notification_preferences?: NotificationPreferencesClientShape | null;
  /** P-256 ECDH SPKI base64 (chat E2EE identity). */
  chat_identity_public_key?: string | null;
  chat_identity_key_updated_at?: string | null;
  /** When true, public profile may expose account email (resolved server-side). */
  public_show_account_email: boolean;
  public_profile_enabled: boolean;
  public_show_phone: boolean;
  public_show_address: boolean;
  public_allow_platform_contact: boolean;
  public_show_in_company_search: boolean;
  marketing_processing_consent: boolean;
  billing_details: Record<string, unknown>;
  /** True when Slovak RPO confirmed the employer IČO (server-set only). */
  registry_verified: boolean;
}

/** Safe fields for any authenticated viewer (GET /profiles/:id). */
export interface PublicProfileDto {
  id: string;
  role: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  bio: string | null;
  description: string | null;
  location: string | null;
  skills: string | null;
  sector: string | null;
  /** Public company site (no auth). */
  website: string | null;
  /** Company registered address / office. */
  registered_office: string | null;
  /** E.164 when the user chose to share it on the public profile. */
  phone_e164: string | null;
  /** Login email when the user enabled public_show_account_email; otherwise null. */
  contact_email: string | null;
  customer_role: boolean;
  worker_role: boolean;
  provider_role: boolean;
  created_at: string;
  rating_average: number;
  rating_count: number;
  /** Slovak RPO (ŠÚ SR) match for company IČO; false for individuals or unverified. */
  registry_verified: boolean;
}

export interface OwnerProfileExtrasDto {
  credits: number;
  subscription: MySubscriptionResponseDto | null;
}

/** GET /api/profiles/:id */
export interface ProfileDetailResponseDto {
  profile: PublicProfileDto;
  owner?: OwnerProfileExtrasDto;
  /** Present when an authenticated visitor already reviewed this profile. */
  viewer_review?: ProfileReviewItemDto | null;
}

export class ProfileOpenChatBodyDto {
  @IsOptional()
  @IsUUID()
  application_id?: string;
}

export interface ProfileOpenChatApplicationDto {
  id: string;
  job_title: string | null;
  status: string;
}

export type ProfileOpenChatResponseDto =
  | { room_id: string }
  | { applications: ProfileOpenChatApplicationDto[] };

/** Legacy flat prefs (still accepted on PATCH). */
export type NotificationPreferencesLegacyShape = {
  new_applications: boolean;
  messages: boolean;
  reviews: boolean;
};

/** v2 matrix returned to the PWA settings UI. */
export type NotificationPreferencesClientShape = {
  v: 2;
  categories: Record<
    string,
    Partial<Record<'in_app' | 'email' | 'push' | 'sms', boolean>>
  >;
};

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  new_applications?: boolean;

  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @IsOptional()
  @IsBoolean()
  reviews?: boolean;

  @IsOptional()
  @IsNumber()
  v?: number;

  @IsOptional()
  @IsObject()
  categories?: Record<string, Record<string, boolean>>;
}

export class ProfileUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  display_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  registered_office?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vat_id?: string | null;

  @IsOptional()
  @IsString()
  avatar_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  education?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  skills?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  job_interests?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sector?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  experience?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registration_number?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logo_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_e164?: string | null;

  @IsOptional()
  @IsBoolean()
  public_show_account_email?: boolean;

  @IsOptional()
  @IsBoolean()
  public_profile_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public_show_phone?: boolean;

  @IsOptional()
  @IsBoolean()
  public_show_address?: boolean;

  @IsOptional()
  @IsBoolean()
  public_allow_platform_contact?: boolean;

  @IsOptional()
  @IsBoolean()
  public_show_in_company_search?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing_processing_consent?: boolean;

  @IsOptional()
  @IsObject()
  billing_details?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  customer_role?: boolean;

  @IsOptional()
  @IsBoolean()
  worker_role?: boolean;

  @IsOptional()
  @IsBoolean()
  provider_role?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notification_preferences?: NotificationPreferencesDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  chat_identity_public_key?: string | null;
}

export class ProfileReviewCreateDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string | null;
}

export interface ProfileReviewItemDto {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_display_name: string | null;
  reviewer_role?: string | null;
  reviewer_avatar_url?: string | null;
  reviewer_logo_url?: string | null;
  reviewer_public_profile_enabled?: boolean;
}
