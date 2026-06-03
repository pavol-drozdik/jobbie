import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

const CATEGORIES = ['tipy', 'kariera', 'brigady', 'firmy', 'novinky'] as const;
const STATUSES = ['draft', 'published'] as const;

export class AdminBlogUpsertDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @IsString()
  @MaxLength(200_000)
  body_html!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cover_image_url?: string | null;

  @IsIn([...CATEGORIES])
  category!: string;

  @IsOptional()
  @IsIn([...STATUSES])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seo_title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  seo_description?: string | null;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  reading_time_minutes?: number | null;
}

export class AdminBlogListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsIn([...STATUSES, 'all'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
