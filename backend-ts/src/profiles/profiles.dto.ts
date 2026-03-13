import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export interface ProfileResponseDto {
  id: string;
  role: string;
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
}
