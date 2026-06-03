import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsObject()
  query_json!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  notify_email?: boolean;
}

export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  query_json?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  notify_email?: boolean;
}

export class SavedSearchResponseDto {
  id!: string;
  user_id!: string;
  name!: string | null;
  query_json!: Record<string, unknown>;
  notify_email!: boolean;
  last_notified_at!: string | null;
  created_at!: string;
  updated_at!: string;
}

export class SavedSearchIdParamDto {
  @IsUUID()
  id!: string;
}
