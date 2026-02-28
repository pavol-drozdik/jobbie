import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

/** Base44-style job response (Supabase job_offers + base44 fields). */
export interface JobOfferResponseDto {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  contract_type: string | null;
  requirements: string | null;
  salary: string | null;
  job_type: string | null;
  expires_at: string | null;
  is_draft: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Base44
  category: string | null;
  is_urgent: boolean;
  is_featured: boolean;
  compensation_type: string | null;
  compensation_amount: number | null;
  workers_needed: number;
  application_deadline: string | null;
  completion_deadline: string | null;
  employer_email: string | null;
  employer_name: string | null;
  photos: string[];
  applications_count: number;
}

export class JobOfferCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  location_address?: string | null;

  @IsOptional()
  @IsNumber()
  location_lat?: number | null;

  @IsOptional()
  @IsNumber()
  location_lng?: number | null;

  @IsOptional()
  @IsString()
  contract_type?: string | null;

  @IsOptional()
  @IsString()
  requirements?: string | null;

  @IsOptional()
  @IsString()
  salary?: string | null;

  @IsOptional()
  @IsString()
  job_type?: string | null;

  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @IsOptional()
  @IsDateString()
  application_deadline?: string | null;

  @IsOptional()
  @IsString()
  completion_deadline?: string | null;

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsString()
  compensation_type?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compensation_amount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  workers_needed?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class JobOfferUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  location_address?: string | null;

  @IsOptional()
  @IsNumber()
  location_lat?: number | null;

  @IsOptional()
  @IsNumber()
  location_lng?: number | null;

  @IsOptional()
  @IsString()
  contract_type?: string | null;

  @IsOptional()
  @IsString()
  requirements?: string | null;

  @IsOptional()
  @IsString()
  salary?: string | null;

  @IsOptional()
  @IsString()
  job_type?: string | null;

  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @IsOptional()
  @IsDateString()
  application_deadline?: string | null;

  @IsOptional()
  @IsString()
  completion_deadline?: string | null;

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsString()
  compensation_type?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compensation_amount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  workers_needed?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
