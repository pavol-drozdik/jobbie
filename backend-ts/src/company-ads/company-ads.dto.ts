import { Type } from 'class-transformer';

import {

  IsArray,

  IsBoolean,

  IsIn,

  IsInt,

  IsNumber,

  IsOptional,

  IsString,

  Max,

  MaxLength,

  Min,

  MinLength,

  ValidateNested,

} from 'class-validator';

import {

  COMPANY_AD_AVAILABILITY,

  COMPANY_AD_BODY_MAX_LENGTH,

  COMPANY_AD_CATEGORIES,

  COMPANY_AD_CONTACT_METHODS,

  COMPANY_AD_EMPLOYEE_COUNTS,

  COMPANY_AD_PRICE_TYPES,

  COMPANY_AD_PROFILE_TYPES,

  COMPANY_AD_SERVICE_AREAS,

  COMPANY_AD_STATUSES,

  COMPANY_AD_TAGLINE_MAX_LENGTH,

  COMPANY_AD_TITLE_MAX_LENGTH,

} from './company-ads.constants';



export type CompanyAdGalleryItem = {

  url: string;

  caption?: string | null;

};



export interface CompanyAdResponseDto {

  id: string;

  owner_id: string;

  thumbnail_url: string | null;

  title: string;

  body: string;

  category: string;

  status: (typeof COMPANY_AD_STATUSES)[number];

  starts_at: string | null;

  ends_at: string | null;

  created_at: string;

  updated_at: string;

  profile_type: string;

  tagline: string | null;

  region: string | null;

  city: string | null;

  street_address: string | null;

  postal_code: string | null;

  show_exact_address: boolean;

  price_type: string | null;

  price_min: number | null;

  price_max: number | null;

  price_negotiable: boolean;

  price_note: string | null;

  availability: string | null;

  works_weekends: boolean;

  evening_hours: boolean;

  emergency_service: boolean;

  contact_person: string | null;

  contact_email: string | null;

  contact_phone: string | null;

  website: string | null;

  preferred_contact_method: string;

  show_phone_publicly: boolean;

  show_email_publicly: boolean;

  ico: string | null;

  dic: string | null;

  ic_dph: string | null;

  founded_year: number | null;

  employee_count: string | null;

  duration_months: number | null;

  services: string[];

  specializations: string[];

  certifications: string[];

  service_areas: string[];

  custom_service_areas: string[];

  gallery_items: CompanyAdGalleryItem[];

  owner_location?: string | null;

  owner_display_name?: string | null;

  owner_company_name?: string | null;

  owner_logo_url?: string | null;

  owner_avatar_url?: string | null;

  owner_registry_verified?: boolean;

  owner_role?: string | null;

  /** True when an active paid `top_category` promotion is active (7 days). */
  show_top_badge?: boolean;

}



/** Public list row: card fields only (no body, gallery, or tax IDs). */

export interface CompanyAdListItemDto {
  id: string;
  owner_id: string;
  thumbnail_url: string | null;
  title: string;
  category: string;
  status: (typeof COMPANY_AD_STATUSES)[number];
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  profile_type: string;
  tagline: string | null;
  region: string | null;
  city: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  price_negotiable: boolean;
  availability: string | null;
  works_weekends: boolean;
  evening_hours: boolean;
  emergency_service: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  preferred_contact_method: string;
  show_phone_publicly: boolean;
  show_email_publicly: boolean;
  services: string[];
  service_areas: string[];
  owner_location: string | null;
  owner_display_name: string | null;
  owner_company_name: string | null;
  owner_logo_url: string | null;
  owner_avatar_url: string | null;
  owner_registry_verified: boolean;

  /** True when an active paid `top_category` promotion is active (7 days). */
  show_top_badge?: boolean;
}



class GalleryItemDto {

  @IsString()

  @MaxLength(2000)

  url!: string;



  @IsOptional()

  @IsString()

  @MaxLength(500)

  caption?: string | null;

}



export class CompanyAdFieldsDto {

  @IsOptional()

  @IsString()

  @IsIn([...COMPANY_AD_PROFILE_TYPES])

  profile_type?: string;



  @IsOptional()

  @IsString()

  @MaxLength(COMPANY_AD_TAGLINE_MAX_LENGTH)

  tagline?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(200)

  region?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(200)

  city?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(300)

  street_address?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(20)

  postal_code?: string | null;



  @IsOptional()

  @IsBoolean()

  show_exact_address?: boolean;



  @IsOptional()

  @IsString()

  @IsIn([...COMPANY_AD_PRICE_TYPES])

  price_type?: string | null;



  @IsOptional()

  @Type(() => Number)

  @IsNumber()

  @Min(0)

  price_min?: number | null;



  @IsOptional()

  @Type(() => Number)

  @IsNumber()

  @Min(0)

  price_max?: number | null;



  @IsOptional()

  @IsBoolean()

  price_negotiable?: boolean;



  @IsOptional()

  @IsString()

  @MaxLength(1000)

  price_note?: string | null;



  @IsOptional()

  @IsString()

  @IsIn([...COMPANY_AD_AVAILABILITY])

  availability?: string | null;



  @IsOptional()

  @IsBoolean()

  works_weekends?: boolean;



  @IsOptional()

  @IsBoolean()

  evening_hours?: boolean;



  @IsOptional()

  @IsBoolean()

  emergency_service?: boolean;



  @IsOptional()

  @IsString()

  @MaxLength(200)

  contact_person?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(320)

  contact_email?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(50)

  contact_phone?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(2000)

  website?: string | null;



  @IsOptional()

  @IsString()

  @IsIn([...COMPANY_AD_CONTACT_METHODS])

  preferred_contact_method?: string;



  @IsOptional()

  @IsBoolean()

  show_phone_publicly?: boolean;



  @IsOptional()

  @IsBoolean()

  show_email_publicly?: boolean;



  @IsOptional()

  @IsString()

  @MaxLength(20)

  ico?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(20)

  dic?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(20)

  ic_dph?: string | null;



  @IsOptional()

  @Type(() => Number)

  @IsInt()

  @Min(1800)

  @Max(2100)

  founded_year?: number | null;



  @IsOptional()

  @IsString()

  @IsIn([...COMPANY_AD_EMPLOYEE_COUNTS])

  employee_count?: string | null;



  @IsOptional()

  @IsArray()

  @IsString({ each: true })

  @MaxLength(120, { each: true })

  services?: string[];



  @IsOptional()

  @IsArray()

  @IsString({ each: true })

  @MaxLength(120, { each: true })

  specializations?: string[];



  @IsOptional()

  @IsArray()

  @IsString({ each: true })

  @MaxLength(120, { each: true })

  certifications?: string[];



  @IsOptional()

  @IsArray()

  @IsString({ each: true })

  @IsIn([...COMPANY_AD_SERVICE_AREAS], { each: true })

  service_areas?: string[];



  @IsOptional()

  @IsArray()

  @IsString({ each: true })

  @MaxLength(120, { each: true })

  custom_service_areas?: string[];



  @IsOptional()

  @IsArray()

  @ValidateNested({ each: true })

  @Type(() => GalleryItemDto)

  gallery_items?: CompanyAdGalleryItem[];

  @IsOptional()
  @IsBoolean()
  want_top_listing?: boolean;

}



export class CreateCompanyAdDto extends CompanyAdFieldsDto {

  @IsString()

  @MinLength(1)

  @MaxLength(COMPANY_AD_TITLE_MAX_LENGTH)

  title!: string;



  @IsString()

  @MinLength(1)

  @MaxLength(COMPANY_AD_BODY_MAX_LENGTH)

  body!: string;



  @IsString()

  @IsIn([...COMPANY_AD_CATEGORIES])

  category!: string;



  @IsOptional()

  @IsString()

  @MaxLength(2000)

  thumbnail_url?: string | null;



  @IsOptional()

  @IsBoolean()

  is_draft?: boolean;



  @IsOptional()

  @Type(() => Number)

  @IsInt()

  @Min(1)

  @Max(12)

  duration_months?: number;

}



export class UpdateCompanyAdDto extends CompanyAdFieldsDto {

  @IsOptional()

  @IsString()

  @MinLength(1)

  @MaxLength(COMPANY_AD_TITLE_MAX_LENGTH)

  title?: string;



  @IsOptional()

  @IsString()

  @MinLength(1)

  @MaxLength(COMPANY_AD_BODY_MAX_LENGTH)

  body?: string;



  @IsOptional()

  @IsString()

  @IsIn([...COMPANY_AD_CATEGORIES])

  category?: string;



  @IsOptional()

  @IsString()

  @MaxLength(2000)

  thumbnail_url?: string | null;



  @IsOptional()

  @IsBoolean()

  publish?: boolean;



  @IsOptional()

  @Type(() => Number)

  @IsInt()

  @Min(1)

  @Max(12)

  duration_months?: number;



  @IsOptional()

  @IsBoolean()

  renew?: boolean;



  @IsOptional()

  @IsString()

  @IsIn([...COMPANY_AD_STATUSES])

  status?: string;

}


