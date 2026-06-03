import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BLOG_CATEGORIES } from './blog.constants';

export class BlogListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

  @IsOptional()
  @IsIn([...BLOG_CATEGORIES])
  category?: string;
}

export type BlogListItemDto = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string;
  reading_time_minutes: number | null;
};

export type BlogListResponseDto = {
  featured: BlogListItemDto | null;
  items: BlogListItemDto[];
  next_cursor: string | null;
};

export type BlogPostDetailDto = BlogListItemDto & {
  body_html: string;
  seo_title: string | null;
  seo_description: string | null;
  author_name: string | null;
  author_role: string | null;
  author_bio: string | null;
  tags: string[];
  related: BlogListItemDto[];
};
