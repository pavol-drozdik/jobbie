import { IsUUID } from 'class-validator';

export class SaveCompanyBodyDto {
  @IsUUID()
  company_id!: string;
}

/** One saved company with profile card fields (company entity, not ad). */
export interface SavedCompanyItemDto {
  company_id: string;
  created_at: string;
  display_name: string | null;
  company_name: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  location: string | null;
  description: string | null;
  registered_office: string | null;
  registry_verified: boolean;
}

export interface SavedCompanyIdsResponseDto {
  company_ids: string[];
}
