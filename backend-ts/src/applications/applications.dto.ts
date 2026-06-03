import { IsIn, IsOptional, IsString } from 'class-validator';

export interface ApplicationResponseDto {
  id: string;
  job_id: string;
  individual_id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  job_title?: string;
}

export class ApplicationCreateDto {
  @IsString()
  job_id!: string;

  @IsOptional()
  @IsString()
  message?: string | null;
}

export class ApplicationStatusPatchDto {
  @IsString()
  @IsIn(['accepted', 'rejected', 'interview_invited', 'pending'])
  status!: 'accepted' | 'rejected' | 'interview_invited' | 'pending';
}
