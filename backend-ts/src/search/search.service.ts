import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { JobOfferResponseDto } from '../jobs/jobs.dto';
import { PublicProfileDto } from '../profiles/profiles.dto';
import {
  SearchQueryDto,
  SearchResponseDto,
  SearchSuggestQueryDto,
  SearchAnalyticsSummaryDto,
} from './search.dto';
import { JOB_SEARCH_HYDRATE_SELECT } from '../jobs/job-list-select';
import { coverPhotosForJobList } from '../jobs/job-photo-url.util';
import { TypesenseService } from './typesense.service';
import type { TypesenseJobSortMode } from './typesense-job-search.types';
import { ListingTopPromotionService } from '../billing/listing-top-promotion.service';
import {
  attachShowTopBadgeToJobs,
  sortByTopBadgeFirst,
} from '../billing/listing-badge-enrichment.util';

import {
  encodeSearchOffsetCursor,
  resolveSearchOffset,
} from './search-cursor';

type JobRow = Record<string, unknown>;
type ProfileRow = Record<string, unknown>;

function computeHasMore(params: {
  readonly itemsLen: number;
  readonly limit: number;
  readonly offset: number;
  readonly found: number;
  readonly source: 'typesense' | 'fallback';
}): boolean {
  if (params.itemsLen < params.limit) {
    return false;
  }
  if (params.source === 'fallback') {
    return params.itemsLen === params.limit;
  }
  return params.offset + params.itemsLen < params.found;
}

function nextCursorOrUndefined(
  hasMore: boolean,
  offset: number,
  itemsLen: number,
): string | undefined {
  if (!hasMore) {
    return undefined;
  }
  return encodeSearchOffsetCursor(offset + itemsLen);
}

function toJobResponse(row: JobRow): JobOfferResponseDto {
  return {
    ...(row as unknown as JobOfferResponseDto),
    photos: coverPhotosForJobList(row.photos),
    applications_count: Number(row.applications_count) || 0,
  };
}

function toProfileResponse(row: ProfileRow): PublicProfileDto {
  return {
    id: String(row.id),
    role: String(row.role ?? 'individual'),
    display_name: (row.display_name as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    skills: (row.skills as string | null) ?? null,
    sector: (row.sector as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    registered_office: (row.registered_office as string | null) ?? null,
    phone_e164: (row.phone_e164 as string | null) ?? null,
    contact_email: null,
    customer_role: Boolean(row.customer_role),
    worker_role: Boolean(row.worker_role),
    provider_role: Boolean(row.provider_role),
    created_at: String(row.created_at ?? new Date().toISOString()),
    rating_average: Number(row.rating_average) || 0,
    rating_count: Number(row.rating_count) || 0,
    registry_verified:
      row.registry_verified_at != null && String(row.registry_verified_at).length > 0,
  };
}

function reorderByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const pos = new Map<string, number>();
  ids.forEach((id, i) => pos.set(id, i));
  return [...rows].sort((a, b) => (pos.get(a.id) ?? 999999) - (pos.get(b.id) ?? 999999));
}

function filterJobRowsByForeignScope(
  rows: JobOfferResponseDto[],
  isForeign: boolean | undefined,
): JobOfferResponseDto[] {
  if (isForeign === undefined) {
    return rows;
  }
  return rows.filter((row) => Boolean(row.is_foreign) === isForeign);
}

function parseOptionalNumber(raw?: string): number | undefined {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return undefined;
  }
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : undefined;
}

const VALID_SALARY_TYPES = new Set([
  'monthly',
  'hourly',
  'one_time',
  'task_based',
  'negotiable',
]);

function mapLegacyCompensationToSalaryType(
  compensationType?: string,
): string | undefined {
  const c = compensationType?.trim();
  if (c === 'hourly') return 'hourly';
  if (c === 'fixed') return 'monthly';
  if (c === 'on_request') return 'negotiable';
  return undefined;
}

function resolveSearchSalaryType(query: SearchQueryDto): string | undefined {
  const raw = query.salary_type?.trim();
  if (raw && VALID_SALARY_TYPES.has(raw)) {
    return raw;
  }
  return mapLegacyCompensationToSalaryType(query.compensation_type);
}

function jobMatchesSalaryTypeFilter(
  job: JobOfferResponseDto,
  salaryType: string,
): boolean {
  if (salaryType === 'negotiable') {
    return (
      job.salary_negotiable === true || job.salary_type === 'negotiable'
    );
  }
  return job.salary_type === salaryType;
}

function splitCommaList(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

function jobTypeParamForTypesense(
  jobTypeRaw?: string,
): { jobType?: string; jobTypes?: string[] } {
  const parts = splitCommaList(jobTypeRaw);
  if (parts.length === 0) {
    return {};
  }
  if (parts.includes('all')) {
    return {};
  }
  if (parts.length === 1) {
    return { jobType: parts[0] };
  }
  return { jobTypes: parts };
}

function createdAfterIsoFromDateRange(
  dr?: string,
): string | null {
  if (!dr || dr === 'all') {
    return null;
  }
  const dayMs = 86400000;
  const now = Date.now();
  if (dr === 'today') {
    return new Date(now - dayMs).toISOString();
  }
  if (dr === 'week') {
    return new Date(now - 7 * dayMs).toISOString();
  }
  if (dr === 'month') {
    return new Date(now - 30 * dayMs).toISOString();
  }
  return null;
}

function createdAfterTsFromDateRange(dr?: string): number | undefined {
  const iso = createdAfterIsoFromDateRange(dr);
  if (!iso) {
    return undefined;
  }
  return Math.floor(new Date(iso).getTime() / 1000);
}

function skillTagsFromSkillsParam(skills?: string): string[] {
  if (!skills?.trim()) {
    return [];
  }
  return [
    ...new Set(
      skills
        .split(/[,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0),
    ),
  ].slice(0, 24);
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly typesense: TypesenseService,
    private readonly topPromotion: ListingTopPromotionService,
  ) {}

  private async enrichJobSearchResults(
    items: JobOfferResponseDto[],
  ): Promise<JobOfferResponseDto[]> {
    if (items.length === 0) {
      return items;
    }
    const topJobIds = await this.topPromotion.getActiveTopJobIds(
      items.map((job) => job.id),
    );
    const enriched = attachShowTopBadgeToJobs(items, topJobIds);
    return sortByTopBadgeFirst(enriched);
  }

  /**
   * Search hydration and `search_*_hybrid` RPCs must use the same DB as job data.
   * A misconfigured read replica (`SUPABASE_READ_URL`) otherwise yields empty lists
   * while `/api/jobs` (primary) still returns rows.
   */
  private db(): ReturnType<SupabaseService['getClient']> {
    return this.supabase.getClient();
  }

  async suggestJobs(query: SearchSuggestQueryDto): Promise<{ suggestions: string[] }> {
    const suggestions = await this.typesense.suggestJobCompletions({
      q: query.q,
      limit: query.limit,
    });
    return { suggestions };
  }

  async searchAnalyticsSummary(
    days: number,
    adminSecret: string | undefined,
  ): Promise<SearchAnalyticsSummaryDto | null> {
    const expected = process.env.SEARCH_ANALYTICS_SECRET;
    if (!expected || adminSecret !== expected) {
      return null;
    }
    const since = new Date(
      Date.now() - Math.min(Math.max(days, 1), 90) * 86400000,
    ).toISOString();
    const client = this.db();
    const { data: top } = await client.rpc('search_analytics_top_queries', {
      p_since: since,
      p_limit: 30,
    });
    const { data: zero } = await client.rpc(
      'search_analytics_zero_result_queries',
      {
        p_since: since,
        p_limit: 30,
      },
    );
    const mapRows = (
      rows: unknown,
    ): Array<{ q: string; count: number }> => {
      if (!Array.isArray(rows)) {
        return [];
      }
      return (rows as Array<{ q?: string; cnt?: unknown }>).map((r) => ({
        q: String(r.q ?? ''),
        count: Number(r.cnt ?? 0),
      }));
    };
    return {
      top_queries: mapRows(top),
      zero_result_queries: mapRows(zero),
    };
  }

  private async logSearchQuery(row: {
    userId: string | null;
    entity: string;
    q: string | null;
    filters: Record<string, unknown>;
    resultCount: number;
    source: string;
    latencyMs: number;
  }): Promise<void> {
    const { error } = await this.supabase.getClient().from('search_query_logs').insert({
      user_id: row.userId,
      entity: row.entity,
      q: row.q,
      filters: row.filters,
      result_count: row.resultCount,
      source: row.source,
      latency_ms: row.latencyMs,
    });
    if (error) {
      this.logger.warn(
        `search_query_logs insert failed: ${error.message} (${error.code ?? 'no-code'})`,
      );
    }
  }

  async search(
    query: SearchQueryDto,
    options?: { userId?: string | null },
  ): Promise<SearchResponseDto> {
    const t0 = Date.now();
    const entity = query.entity ?? 'jobs';
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const offset = resolveSearchOffset({
      cursor: query.cursor,
      offset: query.offset,
      page: query.page,
      limit,
    });
    if (entity === 'profiles') {
      return this.searchProfiles({ ...query, limit, offset }, t0, options);
    }
    return this.searchJobs({ ...query, limit, offset }, t0, options);
  }

  private async searchJobs(
    query: SearchQueryDto & { limit: number; offset: number },
    t0: number,
    options?: { userId?: string | null },
  ): Promise<SearchResponseDto> {
    const minW = parseOptionalNumber(query.min_hourly_wage);
    const maxW = parseOptionalNumber(query.max_hourly_wage);
    const skillTags = skillTagsFromSkillsParam(query.skills);
    const createdAfterTs = createdAfterTsFromDateRange(query.date_range);
    const sort: TypesenseJobSortMode = query.sort ?? 'relevance';
    const includeFacets = query.include_facets !== 'false';
    const facetBy = query.facet_by?.trim() || undefined;
    const baseFilters = {
      category: query.category,
      job_type: query.job_type,
      work_mode: query.work_mode,
      salary_type: query.salary_type,
      salary_min: query.salary_min,
      salary_max: query.salary_max,
      date_range: query.date_range,
      min_hourly_wage: query.min_hourly_wage,
      max_hourly_wage: query.max_hourly_wage,
      skills: query.skills,
      sort: query.sort,
      location: query.location,
      urgent_only: query.urgent_only,
      featured_only: query.featured_only,
      compensation_type: query.compensation_type,
      is_foreign: query.is_foreign,
    };
    const isForeignFilter =
      query.is_foreign === 'true'
        ? true
        : query.is_foreign === 'false'
          ? false
          : undefined;
    const workModesFromQuery = splitCommaList(query.work_mode).filter((w) =>
      ['on_site', 'hybrid', 'remote'].includes(w),
    );
    const salaryType = resolveSearchSalaryType(query);
    let salaryMinNum = parseOptionalNumber(query.salary_min);
    const salaryMaxNum = parseOptionalNumber(query.salary_max);
    if (
      salaryMinNum === undefined &&
      salaryType === 'hourly' &&
      minW !== undefined
    ) {
      salaryMinNum = minW;
    }
    const legacyComp =
      !salaryType &&
      query.compensation_type &&
      query.compensation_type.trim() !== ''
        ? query.compensation_type.trim()
        : undefined;
    const jtParams = jobTypeParamForTypesense(query.job_type);
    let typesenseEmptyWithForeignFilter = false;
    const useTypesenseForForeign =
      isForeignFilter === undefined ||
      (await this.typesense.jobsIndexSupportsForeignFilter());
    if (useTypesenseForForeign) {
      try {
      const ts = await this.typesense.searchJobsTypesense({
        q: query.q,
        location: query.location,
        category:
          query.category && query.category !== 'all' ? query.category : undefined,
        ...jtParams,
        workModes:
          workModesFromQuery.length > 0 ? workModesFromQuery : undefined,
        urgentOnly: query.urgent_only === 'true',
        minHourlyWage: minW,
        maxHourlyWage: maxW,
        createdAfterTs,
        skillTagsAny: skillTags.length > 0 ? skillTags : undefined,
        featuredOnly: query.featured_only === 'true',
        compensationType: legacyComp,
        salaryType,
        salaryMin: salaryMinNum,
        salaryMax: salaryMaxNum,
        limit: query.limit,
        offset: query.offset,
        sort,
        facetBy,
        includeFacets,
        isForeign: isForeignFilter,
      });
      if (ts) {
        const latencyTs = Date.now() - t0;
        if (ts.ids.length === 0 && isForeignFilter === undefined) {
          void this.logSearchQuery({
            userId: options?.userId ?? null,
            entity: 'jobs',
            q: query.q?.trim() || null,
            filters: baseFilters,
            resultCount: 0,
            source: 'typesense',
            latencyMs: latencyTs,
          });
          const hasMore = computeHasMore({
            itemsLen: 0,
            limit: query.limit,
            offset: query.offset,
            found: ts.found,
            source: 'typesense',
          });
          return {
            entity: 'jobs',
            source: 'typesense',
            items: [],
            found: ts.found,
            facet_counts: ts.facetCounts,
            next_cursor: nextCursorOrUndefined(hasMore, query.offset, 0),
            has_more: hasMore,
          };
        }
        if (ts.ids.length === 0 && isForeignFilter !== undefined) {
          typesenseEmptyWithForeignFilter = true;
        } else if (ts.ids.length > 0) {
          const latencyHydrate = Date.now() - t0;
          let hydrateQuery = this.db()
            .from('job_offers')
            .select(JOB_SEARCH_HYDRATE_SELECT)
            .in('id', ts.ids)
            .eq('is_deleted', false);
          if (isForeignFilter === true) {
            hydrateQuery = hydrateQuery.eq('is_foreign', true);
          } else if (isForeignFilter === false) {
            hydrateQuery = hydrateQuery.eq('is_foreign', false);
          }
          const { data } = await hydrateQuery;
          const rows = filterJobRowsByForeignScope(
            ((data ?? []) as JobRow[]).map(toJobResponse),
            isForeignFilter,
          );
          const items = rows.length > 0 ? reorderByIds(rows, ts.ids) : [];
          const enrichedItems = await this.enrichJobSearchResults(items);
          void this.logSearchQuery({
            userId: options?.userId ?? null,
            entity: 'jobs',
            q: query.q?.trim() || null,
            filters: baseFilters,
            resultCount: enrichedItems.length,
            source: 'typesense',
            latencyMs: latencyHydrate,
          });
          if (enrichedItems.length > 0) {
            const hasMore = computeHasMore({
              itemsLen: enrichedItems.length,
              limit: query.limit,
              offset: query.offset,
              found: ts.found,
              source: 'typesense',
            });
            return {
              entity: 'jobs',
              source: 'typesense',
              items: enrichedItems,
              found: ts.found,
              facet_counts: ts.facetCounts,
              next_cursor: nextCursorOrUndefined(
                hasMore,
                query.offset,
                enrichedItems.length,
              ),
              has_more: hasMore,
            };
          }
          this.logger.warn(
            'Typesense returned job ids but none matched job_offers (stale index or id mismatch); using Postgres fallback.',
          );
        }
      }
      } catch (err) {
        this.logger.warn(
          `Typesense jobs search failed, fallback: ${String(err)}`,
        );
      }
    }
    const createdAfterIso = createdAfterIsoFromDateRange(query.date_range);
    const { data, error: rpcError } = await this.db().rpc(
      'search_jobs_hybrid',
      {
      p_q: query.q?.trim() || '',
      p_category:
        query.category && query.category !== 'all' ? query.category : null,
      p_job_type:
        query.job_type && query.job_type !== 'all' ? query.job_type : null,
      p_location: query.location?.trim() || null,
      p_urgent_only: query.urgent_only === 'true',
      p_limit: query.limit,
      p_offset: query.offset,
      p_min_compensation: minW ?? null,
      p_max_compensation: maxW ?? null,
      p_created_after: createdAfterIso,
      p_skills: query.skills?.trim() || null,
      p_is_foreign: isForeignFilter ?? null,
      },
    );
    if (rpcError) {
      this.logger.warn(
        `search_jobs_hybrid RPC failed: ${rpcError.message}`,
      );
    }
    let rows = filterJobRowsByForeignScope(
      ((data ?? []) as JobRow[]).map(toJobResponse),
      isForeignFilter,
    );
    if (typesenseEmptyWithForeignFilter && rows.length > 0) {
      this.logger.debug(
        'Typesense returned no jobs for is_foreign filter but Postgres found matches; run `npm run search:reindex` in backend-ts to refresh the jobs index.',
      );
    }
    if (salaryType) {
      rows = rows.filter((j) => jobMatchesSalaryTypeFilter(j, salaryType));
    } else if (query.compensation_type && query.compensation_type.trim() !== '') {
      rows = rows.filter((j) => j.compensation_type === query.compensation_type);
    }
    if (query.featured_only === 'true') {
      rows = rows.filter((j) => j.is_featured);
    }
    const latency = Date.now() - t0;
    void this.logSearchQuery({
      userId: options?.userId ?? null,
      entity: 'jobs',
      q: query.q?.trim() || null,
      filters: baseFilters,
      resultCount: rows.length,
      source: 'fallback',
      latencyMs: latency,
    });
    const enrichedRows = await this.enrichJobSearchResults(rows);
    const fallbackFoundApprox = query.offset + enrichedRows.length;
    const hasMore = computeHasMore({
      itemsLen: enrichedRows.length,
      limit: query.limit,
      offset: query.offset,
      found: fallbackFoundApprox,
      source: 'fallback',
    });
    return {
      entity: 'jobs',
      source: 'fallback',
      items: enrichedRows,
      found: fallbackFoundApprox,
      next_cursor: nextCursorOrUndefined(
        hasMore,
        query.offset,
        enrichedRows.length,
      ),
      has_more: hasMore,
    };
  }

  private async searchProfiles(
    query: SearchQueryDto & { limit: number; offset: number },
    t0: number,
    options?: { userId?: string | null },
  ): Promise<SearchResponseDto> {
    const baseFilters = {
      location: query.location,
      worker_role: query.worker_role,
      provider_role: query.provider_role,
      customer_role: query.customer_role,
    };
    try {
      const ts = await this.typesense.searchProfileIds({
        q: query.q,
        location: query.location,
        limit: query.limit,
        offset: query.offset,
        customerRole: query.customer_role === 'true',
        workerRole: query.worker_role === 'true',
        providerRole: query.provider_role === 'true',
      });
      if (ts) {
        const latency = Date.now() - t0;
        if (ts.ids.length === 0) {
          void this.logSearchQuery({
            userId: options?.userId ?? null,
            entity: 'profiles',
            q: query.q?.trim() || null,
            filters: baseFilters,
            resultCount: 0,
            source: 'typesense',
            latencyMs: latency,
          });
          return {
            entity: 'profiles',
            source: 'typesense',
            items: [],
            found: ts.found,
            has_more: false,
          };
        }
        const { data } = await this.db()
          .from('profiles')
          .select(
            'id,role,display_name,company_name,avatar_url,logo_url,bio,description,location,skills,sector,registered_office,website,phone_e164,customer_role,worker_role,provider_role,created_at,registry_verified_at',
          )
          .in('id', ts.ids);
        const rows = ((data ?? []) as ProfileRow[]).map(toProfileResponse);
        const items =
          rows.length > 0
            ? reorderByIds(rows, ts.ids)
            : [];
        void this.logSearchQuery({
          userId: options?.userId ?? null,
          entity: 'profiles',
          q: query.q?.trim() || null,
          filters: baseFilters,
          resultCount: items.length,
          source: 'typesense',
          latencyMs: latency,
        });
        const hasMore = computeHasMore({
          itemsLen: items.length,
          limit: query.limit,
          offset: query.offset,
          found: ts.found,
          source: 'typesense',
        });
        return {
          entity: 'profiles',
          source: 'typesense',
          items,
          found: ts.found,
          next_cursor: nextCursorOrUndefined(hasMore, query.offset, items.length),
          has_more: hasMore,
        };
      }
    } catch (err) {
      this.logger.warn(`Typesense profiles search failed, fallback: ${String(err)}`);
    }
    const { data } = await this.db().rpc('search_profiles_hybrid', {
      p_q: query.q?.trim() || '',
      p_location: query.location?.trim() || null,
      p_limit: query.limit,
      p_offset: query.offset,
    });
    const rows = ((data ?? []) as ProfileRow[]).map(toProfileResponse);
    let filtered = rows;
    if (query.worker_role === 'true') {
      filtered = filtered.filter((p) => p.worker_role);
    }
    if (query.provider_role === 'true') {
      filtered = filtered.filter((p) => p.provider_role);
    }
    if (query.customer_role === 'true') {
      filtered = filtered.filter((p) => p.customer_role);
    }
    const latency = Date.now() - t0;
    void this.logSearchQuery({
      userId: options?.userId ?? null,
      entity: 'profiles',
      q: query.q?.trim() || null,
      filters: baseFilters,
      resultCount: filtered.length,
      source: 'fallback',
      latencyMs: latency,
    });
    const pfFoundApprox = query.offset + filtered.length;
    const hasMore = computeHasMore({
      itemsLen: filtered.length,
      limit: query.limit,
      offset: query.offset,
      found: pfFoundApprox,
      source: 'fallback',
    });
    return {
      entity: 'profiles',
      source: 'fallback',
      items: filtered,
      found: pfFoundApprox,
      next_cursor: nextCursorOrUndefined(hasMore, query.offset, filtered.length),
      has_more: hasMore,
    };
  }
}
