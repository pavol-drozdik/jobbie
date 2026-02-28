import { IsOptional, IsString, MaxLength } from 'class-validator';

export interface ProfileResponseDto {
  id: string;
  role: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  skills: string | null;
  job_interests: string | null;
  location: string | null;
  description: string | null;
  sector: string | null;
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
}
