import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BLOG_IMAGE_MAX_BYTES, type BlogStoragePurpose } from './upload-policy';

export class AdminStorageInitDto {
  @IsString()
  @MaxLength(255)
  originalFilename!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BLOG_IMAGE_MAX_BYTES)
  sizeBytes!: number;

  @IsOptional()
  @IsIn(['blog_cover', 'blog_content'])
  purpose?: BlogStoragePurpose;
}

export class AdminStorageFinalizeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BLOG_IMAGE_MAX_BYTES)
  reportedSizeBytes?: number;
}
