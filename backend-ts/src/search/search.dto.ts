import {
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobOfferResponseDto } from '../jobs/jobs.dto';
import { PublicProfileDto } from '../profiles/profiles.dto';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['jobs', 'profiles'])
  entity?: 'jobs' | 'profiles';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  job_type?: string;

  /** Comma-separated `on_site`, `hybrid`, `remote` (OR semantics in Typesense). */
  @IsOptional()
  @IsString()
  work_mode?: string;

  @IsOptional()
  @IsString()
  salary_type?: string;

  @IsOptional()
  @IsString()
  salary_min?: string;

  @IsOptional()
  @IsString()
  salary_max?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  urgent_only?: string;

  @IsOptional()
  @IsIn(['all', 'today', 'week', 'month'])
  date_range?: 'all' | 'today' | 'week' | 'month';

  @IsOptional()
  @IsString()
  min_hourly_wage?: string;

  @IsOptional()
  @IsString()
  max_hourly_wage?: string;

  /** Comma-separated skill tokens (matched against indexed job requirements tags). */
  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsIn(['relevance', 'created_at', 'compensation_amount'])
  sort?: 'relevance' | 'created_at' | 'compensation_amount';

  @IsOptional()
  @IsString()
  facet_by?: string;

  @IsOptional()
  @IsString()
  include_facets?: string;

  @IsOptional()
  @IsString()
  featured_only?: string;

  /** `true` or `false` — domestic vs foreign job catalog split. */
  @IsOptional()
  @IsIn(['true', 'false'])
  is_foreign?: string;

  @IsOptional()
  @IsIn(['hourly', 'fixed', 'on_request', 'auction'])
  compensation_type?: string;

  @IsOptional()
  @IsString()
  worker_role?: string;

  @IsOptional()
  @IsString()
  provider_role?: string;

  @IsOptional()
  @IsString()
  customer_role?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number;

  /** 1-based page for crawlable catalog URLs (`?page=`). Maps to offset when set. */
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  page?: number;

  /** Opaque pagination cursor from previous response (`next_cursor`). */
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class SearchSuggestQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(20)
  limit?: number;
}

export type SearchSource = 'typesense' | 'fallback';

export type SearchFacetCountsDto = {
  field: string;
  counts: Array<{ value: string; count: number }>;
};

export type SearchJobResponseDto = {
  entity: 'jobs';
  source: SearchSource;
  items: JobOfferResponseDto[];
  found: number;
  facet_counts?: SearchFacetCountsDto[];
  /** Present when more results exist for the same query. */
  next_cursor?: string;
  has_more: boolean;
};

export type SearchProfileItemDto = Pick<
  PublicProfileDto,
  | 'id'
  | 'role'
  | 'display_name'
  | 'company_name'
  | 'avatar_url'
  | 'logo_url'
  | 'bio'
  | 'description'
  | 'location'
  | 'skills'
  | 'sector'
  | 'customer_role'
  | 'worker_role'
  | 'provider_role'
  | 'created_at'
  | 'registry_verified'
> & {
  rating_average: number;
  rating_count: number;
};

export type SearchProfileResponseDto = {
  entity: 'profiles';
  source: SearchSource;
  items: SearchProfileItemDto[];
  found: number;
  next_cursor?: string;
  has_more: boolean;
};

export type SearchResponseDto = SearchJobResponseDto | SearchProfileResponseDto;

export type SearchAnalyticsSummaryDto = {
  top_queries: Array<{ q: string; count: number }>;
  zero_result_queries: Array<{ q: string; count: number }>;
};
