import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { StorageUploadPurpose } from './file-allowlist';
import { CHAT_MEDIA_MAX_BYTES, type JobPhotoKind } from './upload-policy';

export class StorageUploadInitDto {
  @IsEnum(['job_photo', 'profile_avatar', 'cv_photo', 'chat_media'])
  purpose!: StorageUploadPurpose;

  @IsString()
  @MaxLength(255)
  originalFilename!: string;

  @IsString()
  @MaxLength(200)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CHAT_MEDIA_MAX_BYTES)
  sizeBytes!: number;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsEnum(['cover', 'extra'])
  kind?: JobPhotoKind;
}

export class StorageUploadFinalizeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportedSizeBytes?: number;
}
