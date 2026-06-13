import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { OptionalAuth } from '../auth/optional-auth.decorator';
import { Public } from '../auth/public.decorator';
import { RequireScopes } from '../auth/scopes.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { sanitizeRichTextHtml } from '../common/sanitize-html.util';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import {
  FeedScoringService,
  type JobForScore,
} from './feed-scoring.service';
import {
  JOB_CARD_LIST_SELECT,
  JOB_LIST_MEMORY_FILTER_SELECT,
  JOB_SEARCH_HYDRATE_SELECT,
} from './job-list-select';
import { coverPhotosForJobList } from './job-photo-url.util';
import { AnonymousCatalogCacheInterceptor } from '../common/interceptors/anonymous-catalog-cache.interceptor';
import {
  JobOfferCreateDto,
  JobOfferUpdateDto,
  JobOfferResponseDto,
  toJobPublishedSocketPayload,
} from './jobs.dto';
import { JobsFeedGateway } from './jobs-feed.gateway';
import { SearchIndexingService } from '../search/search-indexing.service';
import { TypesenseService } from '../search/typesense.service';
import { AuditService } from '../audit/audit.service';
import { getCreditCost } from '../billing/billing.config';
import { CreditsService } from '../billing/credits.service';
import { SubscriptionLimitsService } from '../billing/subscription-limits.service';
import { ListingTopPromotionService } from '../billing/listing-top-promotion.service';
import { isJobListingLiveForTop } from '../billing/listing-live.util';
import {
  attachShowTopBadgeToJobs,
  sortByTopBadgeFirst,
} from '../billing/listing-badge-enrichment.util';
import { normalizeJobPhotos } from './normalize-job-photos.util';
import { isApplicationDeadlinePassed } from './job-deadline.util';
import { buildJobOfferRowFromBody } from './job-offer-mapper';
import { pickJobUpdateFields } from './job-update-fields';
import { validateJobForPublish } from './job-offer-publish.validation';
import {
  mapJobForViewer,
  viewerFromUser,
} from './public-response.mapper';
import { ProfileActivityAuthorizationService } from '../profiles/profile-activity-authorization.service';
import { IndexNowService } from '../seo/indexnow.service';
import {
  JOB_CATEGORY_SLUGS,
  normalizeJobCategorySlugOrNull,
} from '../common/job-categories.constants';

type JobRow = Record<string, unknown> & {
  photos?: unknown;
  applications_count?: number;
};

function reorderJobsByIds(
  rows: JobOfferResponseDto[],
  ids: string[],
): JobOfferResponseDto[] {
  const pos = new Map(ids.map((id, i) => [id, i]));
  return [...rows].sort(
    (a, b) => (pos.get(a.id) ?? 999999) - (pos.get(b.id) ?? 999999),
  );
}

function wantsTopListing(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function escapePostgrestIlikePattern(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, ' ')
    .replace(/"/g, '');
}

function toResponse(row: JobRow | null): JobOfferResponseDto {
  if (!row) throw new NotFoundException('Job not found');
  const photosArr = normalizeJobPhotos(row.photos);
  const rawCategory = (row.category as string | null) ?? null;
  const normalizedCategory = normalizeJobCategorySlugOrNull(rawCategory);
  return {
    ...row,
    category: normalizedCategory ?? rawCategory,
    photos: photosArr as string[],
    applications_count: Number(row.applications_count) || 0,
    is_foreign: Boolean((row as { is_foreign?: boolean }).is_foreign),
  } as JobOfferResponseDto;
}

function mapRowForViewer(
  row: JobRow,
  user: CurrentUser | null,
): JobOfferResponseDto {
  return mapJobForViewer(toResponse(row), viewerFromUser(user));
}

function mapRowForListViewer(
  row: JobRow,
  user: CurrentUser | null,
): JobOfferResponseDto {
  const dto = mapRowForViewer(row, user);
  return {
    ...dto,
    photos: coverPhotosForJobList(dto.photos),
  };
}

function mapRowsForViewer(
  rows: JobRow[],
  user: CurrentUser | null,
): JobOfferResponseDto[] {
  const viewer = viewerFromUser(user);
  return rows.map((row) => mapJobForViewer(toResponse(row), viewer));
}

function mapRowsForListViewer(
  rows: JobRow[],
  user: CurrentUser | null,
): JobOfferResponseDto[] {
  return rows.map((row) => mapRowForListViewer(row, user));
}

function isPublicJobOffer(dto: JobOfferResponseDto): boolean {
  return dto.is_active === true && dto.is_draft !== true;
}

function jobRowLiveFlags(row: JobRow): {
  is_draft?: boolean | null;
  is_active?: boolean | null;
} {
  return {
    is_draft: row.is_draft as boolean | null | undefined,
    is_active: row.is_active as boolean | null | undefined,
  };
}

@Controller('jobs')
export class JobsController {
  constructor(
    private supabase: SupabaseService,
    private feedScoring: FeedScoringService,
    private jobsFeed: JobsFeedGateway,
    private searchIndexing: SearchIndexingService,
    private typesense: TypesenseService,
    private audit: AuditService,
    private credits: CreditsService,
    private limits: SubscriptionLimitsService,
    private topPromotion: ListingTopPromotionService,
    private profileActivity: ProfileActivityAuthorizationService,
    private indexNow: IndexNowService,
  ) {}

  private async enrichJobsTopBadge(
    jobs: JobOfferResponseDto[],
  ): Promise<JobOfferResponseDto[]> {
    if (jobs.length === 0) {
      return jobs;
    }
    const topJobIds = await this.topPromotion.getActiveTopJobIds(
      jobs.map((j) => j.id),
    );
    const enriched = attachShowTopBadgeToJobs(jobs, topJobIds);
    return sortByTopBadgeFirst(enriched);
  }

  private async sortJobRowsTopFirst(rows: JobRow[]): Promise<JobRow[]> {
    if (rows.length <= 1) {
      return rows;
    }
    const topJobIds = await this.topPromotion.getActiveTopJobIds(
      rows.map((r) => String(r.id ?? '')),
    );
    const withBadge = rows.map((r) => ({
      ...r,
      show_top_badge: topJobIds.has(String(r.id ?? '')),
    }));
    return sortByTopBadgeFirst(withBadge) as JobRow[];
  }

  private async applyTopListingOnPublish(
    userId: string,
    jobId: string,
    wantTop: boolean | undefined,
  ): Promise<void> {
    if (!wantsTopListing(wantTop)) {
      return;
    }
    await this.topPromotion.applyJobTopCategoryIfRequested(
      userId,
      jobId,
      true,
      'job_publish_top',
    );
  }

  private async tryApplyTopListingOnJobSave(
    userId: string,
    jobId: string,
    wantTop: boolean | undefined,
    row: JobRow,
    reason: string,
  ): Promise<void> {
    if (!wantsTopListing(wantTop) || !isJobListingLiveForTop(jobRowLiveFlags(row))) {
      return;
    }
    try {
      await this.topPromotion.applyJobTopCategoryIfRequested(
        userId,
        jobId,
        true,
        reason,
      );
    } catch {
      /* Publish/save succeeds; client may retry POST .../top-listing. */
    }
  }

  private listFetchCap(offsetNum: number, limitNum: number): number {
    return Math.min(200, Math.max(80, offsetNum + limitNum * 3));
  }

  private async enrichJobTopBadge(
    job: JobOfferResponseDto,
  ): Promise<JobOfferResponseDto> {
    const [enriched] = await this.enrichJobsTopBadge([job]);
    return enriched;
  }

  private renewJobSpendRefId(jobId: string): string {
    return `${jobId}:renew:${new Date().toISOString().slice(0, 16)}`;
  }

  // NOTE: Publish/renew — spend_credits first (idempotent ref), then activate; reverseSpendByRef on DB failure.
  private async chargeJobPublish(
    userId: string,
    jobId: string,
    reason: 'job_publish' | 'renew_job',
    isUrgent: boolean,
  ): Promise<{ refType: string; refId: string }> {
    const tierAction = isUrgent ? 'publishUrgentJob' : 'publishJobMonth';
    const refType = 'job_offer';
    const refId =
      reason === 'renew_job' ? this.renewJobSpendRefId(jobId) : jobId;
    await this.credits.spendForPlanTier(userId, tierAction, {
      reason,
      refType,
      refId,
      subjectType: 'job_offer',
      subjectId: jobId,
    });
    return { refType, refId };
  }

  private async rollbackJobSpend(
    userId: string,
    refType: string,
    refId: string,
    rollbackReason: string,
  ): Promise<void> {
    await this.credits.reverseSpendByRef(userId, refType, refId, rollbackReason);
  }

  private emitJobPublishedIfPublic(dto: JobOfferResponseDto): void {
    if (!isPublicJobOffer(dto)) {
      return;
    }
    this.jobsFeed.emitJobPublished(toJobPublishedSocketPayload(dto));
    this.indexNow.notifyJobPublished(dto.id);
  }

  // PERF: Paginated catalog — do not load unbounded rows; Typesense used when configured.
  /** List jobs. When user is logged in, order by rule-based score (see FeedScoringService). */
  @Get()
  @OptionalAuth()
  @UseInterceptors(AnonymousCatalogCacheInterceptor)
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async list(
    @CurrentUserDecorator() user: CurrentUser | null,
    @Query('company_id') companyId?: string,
    @Query('is_active') isActive?: string,
    @Query('my') my?: string,
    @Query('category') category?: string,
    @Query('job_type') jobType?: string,
    @Query('compensation_type') compensationType?: string,
    @Query('urgent_only') urgentOnly?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('min_hourly_wage') minHourlyWage?: string,
    @Query('date_range') dateRange?: string,
    @Query('max_hourly_wage') maxHourlyWage?: string,
    @Query('location') location?: string,
    @Query('plan_tier') planTier?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Query('is_foreign') isForeign?: string,
  ): Promise<JobOfferResponseDto[]> {
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Math.max(Number(offset) || 0, 0);
    const filterByMy = my === 'true';
    const effectiveCompanyId =
      filterByMy && user ? user.id : companyId;
    const isOwnerScopedList = Boolean(
      user &&
        (filterByMy ||
          (effectiveCompanyId && effectiveCompanyId === user.id)),
    );

    const locRaw = location?.trim();
    const qRaw = q?.trim();
    const hasBothLocationAndQuery = Boolean(locRaw && qRaw);
    const filterPlanTier =
      planTier && ['bronze', 'silver', 'gold'].includes(planTier);
    const needsMemoryPipeline =
      Boolean(user) || filterPlanTier || hasBothLocationAndQuery;

    const listSelect =
      needsMemoryPipeline && qRaw
        ? JOB_LIST_MEMORY_FILTER_SELECT
        : JOB_CARD_LIST_SELECT;
    const dbClient = isOwnerScopedList
      ? this.supabase.getClient()
      : this.supabase.getReadClient();
    let query = dbClient
      .from('job_offers')
      .select(listSelect)
      .eq('is_deleted', false);

    if (effectiveCompanyId) {
      query = query.eq('company_id', effectiveCompanyId);
    }
    if (isForeign === 'true') {
      query = query.eq('is_foreign', true);
    } else if (isForeign === 'false') {
      query = query.eq('is_foreign', false);
    }
    if (isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }
    if (!isOwnerScopedList) {
      if (isActive === undefined || isActive === '') {
        query = query.eq('is_active', true);
      }
      query = query.or('is_draft.is.null,is_draft.eq.false');
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (jobType) {
      query = query.eq('job_type', jobType);
    }
    if (compensationType) {
      query = query.eq('compensation_type', compensationType);
    }
    if (urgentOnly === 'true') {
      query = query.eq('is_urgent', true);
    }

    if (dateRange && dateRange !== 'all') {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const maxAge =
        dateRange === 'today'
          ? day
          : dateRange === 'week'
            ? 7 * day
            : dateRange === 'month'
              ? 30 * day
              : Infinity;
      if (Number.isFinite(maxAge)) {
        query = query.gte(
          'created_at',
          new Date(now - maxAge).toISOString(),
        );
      }
    }

    if (minHourlyWage) {
      const min = parseFloat(minHourlyWage);
      if (!Number.isNaN(min)) {
        query = query.gte('compensation_amount', min);
      }
    }
    if (maxHourlyWage) {
      const max = parseFloat(maxHourlyWage);
      if (!Number.isNaN(max)) {
        query = query.lte('compensation_amount', max);
      }
    }

    if (locRaw && !qRaw) {
      const inner = escapePostgrestIlikePattern(locRaw);
      const p = `%${inner}%`;
      query = query.or(
        `location.ilike.${p},location_address.ilike.${p}`,
      );
    } else if (qRaw && !locRaw) {
      const inner = escapePostgrestIlikePattern(qRaw);
      const p = `%${inner}%`;
      query = query.or(
        `title.ilike.${p},description.ilike.${p},location.ilike.${p},location_address.ilike.${p}`,
      );
    }

    if (!needsMemoryPipeline) {
      let q2 = query;
      if (sort === 'date_asc') {
        q2 = q2.order('created_at', { ascending: true });
      } else if (sort === 'wage_desc') {
        q2 = q2.order('compensation_amount', {
          ascending: false,
        });
      } else {
        q2 = q2.order('created_at', { ascending: false });
      }
      const fetchCap = this.listFetchCap(offsetNum, limitNum);
      const { data: rows } = await q2.limit(fetchCap);
      let list = (rows ?? []) as unknown as JobRow[];
      list = await this.sortJobRowsTopFirst(list);
      const paginated = list.slice(offsetNum, offsetNum + limitNum);
      return this.enrichJobsTopBadge(mapRowsForListViewer(paginated, user));
    }

    const fetchCap = this.listFetchCap(offsetNum, limitNum);
    const { data: rows } = await query
      .order('created_at', { ascending: false })
      .limit(fetchCap);

    let list = (rows ?? []) as unknown as JobRow[];

    if (locRaw) {
      const loc = locRaw.toLowerCase();
      list = list.filter((j) => {
        const loc1 = j.location ? String(j.location).toLowerCase() : '';
        const loc2 = j.location_address
          ? String(j.location_address).toLowerCase()
          : '';
        return loc1.includes(loc) || loc2.includes(loc);
      });
    }

    if (qRaw) {
      const lower = qRaw.toLowerCase();
      list = list.filter((j) => {
        const tags = Array.isArray(j.skill_tags)
          ? (j.skill_tags as string[])
          : [];
        return (
          (j.title && String(j.title).toLowerCase().includes(lower)) ||
          (j.description &&
            String(j.description).toLowerCase().includes(lower)) ||
          tags.some((tag) => String(tag).toLowerCase().includes(lower)) ||
          (j.location && String(j.location).toLowerCase().includes(lower)) ||
          (j.location_address &&
            String(j.location_address).toLowerCase().includes(lower))
        );
      });
    }

    if (filterPlanTier) {
      const client = this.supabase.getClient();
      const { data: plansData } = await client
        .from('subscription_plans')
        .select('id,slug');
      const plans = Array.isArray(plansData) ? plansData : [];
      const planIds = plans
        .filter(
          (p) =>
            (p as { slug?: string }).slug &&
            (p as { slug: string }).slug === planTier,
        )
        .map((p) => (p as { id: string }).id);
      if (planIds.length === 0) {
        return [];
      }
      const { data: subsData } = await client
        .from('user_subscriptions')
        .select('user_id,plan_id,status')
        .in('plan_id', planIds)
        .eq('status', 'active');
      const subs = Array.isArray(subsData) ? subsData : [];
      const allowed = new Set(
        subs.map((s) => (s as { user_id: string }).user_id),
      );
      list = list.filter((j) => {
        const cid = (j.company_id ?? null) as string | null;
        return cid != null && allowed.has(cid);
      });
    }

    if (user) {
      const { profile, engagement } =
        await this.feedScoring.loadEngagement(user.id);
      list = this.feedScoring.scoreAndSort(
        list as unknown as JobForScore[],
        profile,
        engagement,
      ) as unknown as JobRow[];
    } else {
      if (sort === 'date_asc') {
        list = [...list].sort(
          (a, b) =>
            new Date((a.created_at as string) ?? 0).getTime() -
            new Date((b.created_at as string) ?? 0).getTime(),
        );
      } else if (sort === 'wage_desc') {
        list = [...list].sort((a, b) => {
          const va = Number(a.compensation_amount) || 0;
          const vb = Number(b.compensation_amount) || 0;
          return vb - va;
        });
      } else {
        list = [...list].sort(
          (a, b) =>
            new Date((b.created_at as string) ?? 0).getTime() -
            new Date((a.created_at as string) ?? 0).getTime(),
        );
      }
    }

    list = await this.sortJobRowsTopFirst(list);
    const paginated = list.slice(offsetNum, offsetNum + limitNum);
    return this.enrichJobsTopBadge(mapRowsForListViewer(paginated, user));
  }

  @Post('impressions')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async recordImpressions(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: { job_ids?: string[] },
  ): Promise<{ ok: boolean }> {
    const raw = Array.isArray(body?.job_ids) ? body.job_ids : [];
    const jobIds = [...new Set(raw.filter((id): id is string => typeof id === 'string'))].slice(
      0,
      100,
    );
    if (jobIds.length === 0) return { ok: true };
    const now = new Date().toISOString();
    const rows = jobIds.map((job_id: string) => ({
      user_id: user.id,
      job_id,
      shown_at: now,
    }));
    await this.supabase.getClient().from('job_impressions').upsert(rows, {
      onConflict: 'user_id,job_id',
      ignoreDuplicates: false,
    });
    this.feedScoring.invalidateEngagement(user.id);
    return { ok: true };
  }

  @Get('saved')
  @UseGuards(JwksAuthGuard)
  async listSaved(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<JobOfferResponseDto[]> {
    const { data: saved } = await this.supabase
      .getClient()
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });
    const jobIds = (saved ?? []).map((r: { job_id: string }) => r.job_id);
    if (jobIds.length === 0) return [];
    const { data: rows } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(JOB_SEARCH_HYDRATE_SELECT)
      .in('id', jobIds)
      .eq('is_deleted', false);
    const order = new Map(jobIds.map((id, i) => [id, i]));
    const list = ((rows ?? []) as JobRow[]).sort(
      (a, b) => (order.get(a.id as string) ?? 0) - (order.get(b.id as string) ?? 0),
    );
    return this.enrichJobsTopBadge(mapRowsForViewer(list, user));
  }

  /** Active, non-deleted job count per known category slug (public). */
  @Get('category-counts')
  @Public()
  async categoryCounts(): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('category')
      .eq('is_deleted', false)
      .eq('is_active', true);
    const tallies = new Map<string, number>();
    if (!error && Array.isArray(data)) {
      for (const row of data as { category?: string | null }[]) {
        const c = row.category;
        if (c) {
          tallies.set(c, (tallies.get(c) ?? 0) + 1);
        }
      }
    }
    const out: Record<string, number> = {};
    for (const slug of JOB_CATEGORY_SLUGS) {
      out[slug] = tallies.get(slug) ?? 0;
    }
    return out;
  }

  /**
   * Chronological newest public jobs (no personalization). For home “latest” strip.
   */
  @Get('latest')
  @Public()
  async listLatest(@Query('limit') limit = '4'): Promise<JobOfferResponseDto[]> {
    const limitNum = Math.min(Math.max(Number(limit) || 4, 1), 20);
    const { data: rows } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(JOB_SEARCH_HYDRATE_SELECT)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .or('is_draft.is.null,is_draft.eq.false')
      .order('created_at', { ascending: false })
      .limit(limitNum);
    return this.enrichJobsTopBadge(
      mapRowsForViewer((rows ?? []) as JobRow[], null),
    );
  }

  /** Curated featured jobs (Typesense `is_featured`, fallback to latest). */
  @Get('featured')
  @OptionalAuth()
  async listFeatured(
    @Query('limit') limit = '12',
  ): Promise<JobOfferResponseDto[]> {
    const lim = Math.min(Math.max(Number(limit) || 12, 1), 48);
    const ids = await this.typesense.searchFeaturedJobIds(lim);
    if (ids.length === 0) {
      return this.listLatest(String(lim));
    }
    const { data: rows } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(JOB_SEARCH_HYDRATE_SELECT)
      .in('id', ids)
      .eq('is_deleted', false)
      .eq('is_active', true);
    const list = mapRowsForViewer((rows ?? []) as JobRow[], null);
    if (list.length === 0) {
      return this.listLatest(String(lim));
    }
    return this.enrichJobsTopBadge(reorderJobsByIds(list, ids));
  }

  /** Trending by application volume (Typesense sort). */
  @Get('trending')
  async listTrending(@Query('limit') limit = '12'): Promise<JobOfferResponseDto[]> {
    const lim = Math.min(Math.max(Number(limit) || 12, 1), 48);
    const ids = await this.typesense.searchTrendingJobIds(lim);
    if (ids.length === 0) {
      return this.listLatest(String(lim));
    }
    const { data: rows } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(JOB_SEARCH_HYDRATE_SELECT)
      .in('id', ids)
      .eq('is_deleted', false)
      .eq('is_active', true);
    const list = mapRowsForViewer((rows ?? []) as JobRow[], null);
    if (list.length === 0) {
      return this.listLatest(String(lim));
    }
    return this.enrichJobsTopBadge(reorderJobsByIds(list, ids));
  }

  /**
   * Rule-based + semantic discovery from the user profile (Typesense hybrid), not batch ML training.
   */
  @Get('recommended')
  @OptionalAuth()
  async listRecommended(
    @CurrentUserDecorator() user: CurrentUser | null,
    @Query('limit') limit = '16',
  ): Promise<JobOfferResponseDto[]> {
    const lim = Math.min(Math.max(Number(limit) || 16, 1), 48);
    if (!this.typesense.isEnabled() || !user?.id) {
      return this.listLatest(String(lim));
    }
    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('skills,sector,description')
      .eq('id', user.id)
      .maybeSingle();
    const pr = profile as {
      skills?: string | null;
      sector?: string | null;
      description?: string | null;
    } | null;
    const parts: string[] = [];
    if (pr?.skills?.trim()) {
      parts.push(pr.skills.trim());
    }
    if (pr?.sector?.trim()) {
      parts.push(pr.sector.trim());
    }
    if (pr?.description?.trim()) {
      parts.push(pr.description.trim().slice(0, 240));
    }
    const qJoined = parts.join(' ').trim();
    const ts = await this.typesense.searchJobsTypesense({
      q: qJoined.length > 0 ? qJoined : undefined,
      limit: lim,
      offset: 0,
      sort: 'relevance',
      includeFacets: false,
    });
    if (!ts || ts.ids.length === 0) {
      return this.listLatest(String(lim));
    }
    const { data: rows } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(JOB_SEARCH_HYDRATE_SELECT)
      .in('id', ts.ids)
      .eq('is_deleted', false)
      .eq('is_active', true);
    const list = mapRowsForViewer((rows ?? []) as JobRow[], user);
    if (list.length === 0) {
      return this.listLatest(String(lim));
    }
    return this.enrichJobsTopBadge(reorderJobsByIds(list, ts.ids));
  }

  @Post()
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: JobOfferCreateDto,
  ): Promise<JobOfferResponseDto> {
    await this.profileActivity.assertActivityRole(
      user.id,
      'customer',
      'Inzerát môže vytvárať len používateľ s rolou „Potrebujem pomoc s prácou“.',
    );
    const isDraft = body.is_draft ?? true;
    validateJobForPublish(body, { isDraft });
    if (!isDraft) {
      await this.limits.assertCanPublish(user.id);
    }

    let employerName: string | null = user.email ?? null;
    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('company_name, display_name')
      .eq('id', user.id)
      .single();
    if (profile && (profile as { company_name?: string }).company_name) {
      employerName = (profile as { company_name: string }).company_name;
    } else if (profile && (profile as { display_name?: string }).display_name) {
      employerName = (profile as { display_name: string }).display_name;
    }

    const row = {
      ...buildJobOfferRowFromBody(body, {
        company_id: user.id,
        employer_email: user.email ?? null,
        employer_name: employerName,
        is_draft: isDraft,
      }),
      is_foreign: body.is_foreign === true,
      applications_count: 0,
      ...(isDraft ? {} : { is_draft: true, is_active: false }),
    };

    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .insert(row)
      .select()
      .single();
    if (error || !data) {
      const message =
        [error?.message, error?.details, error?.code]
          .filter(Boolean)
          .join(' ') || 'Failed to create job';
      throw new ForbiddenException(message);
    }
    let jobRow = data as JobRow;
    if (!isDraft) {
      const jobId = String(jobRow.id);
      const spendRef = await this.chargeJobPublish(
        user.id,
        jobId,
        'job_publish',
        Boolean(body.is_urgent),
      );
      try {
        const { data: activated, error: actErr } = await this.supabase
          .getClient()
          .from('job_offers')
          .update({ is_draft: false, is_active: true })
          .eq('id', jobId)
          .eq('company_id', user.id)
          .select()
          .single();
        if (actErr || !activated) {
          throw new ForbiddenException(
            'Failed to publish job after charging credits',
          );
        }
        jobRow = activated as JobRow;
      } catch (e) {
        await this.rollbackJobSpend(
          user.id,
          spendRef.refType,
          spendRef.refId,
          'job_publish_rollback',
        );
        throw e;
      }
      try {
        await this.applyTopListingOnPublish(
          user.id,
          jobId,
          body.want_top_listing,
        );
      } catch {
        /* Listing stays published; client may retry POST .../top-listing. */
      }
    }
    const created = mapRowForViewer(jobRow, user);
    void this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'job_offer.created',
      subjectType: 'job_offer',
      subjectId: created.id,
      payload: {
        title: created.title,
        is_draft: Boolean(created.is_draft),
        is_active: Boolean(created.is_active),
      },
    });
    this.emitJobPublishedIfPublic(created);
    void this.searchIndexing.indexJobById(created.id);
    return this.enrichJobTopBadge(created);
  }

  @Post(':job_id/view')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async recordView(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ ok: boolean }> {
    await this.supabase
      .getClient()
      .from('job_views')
      .upsert(
        { user_id: user.id, job_id: jobId, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,job_id' },
      );
    this.feedScoring.invalidateEngagement(user.id);
    return { ok: true };
  }

  @Post(':job_id/save')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async saveJob(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ ok: boolean }> {
    await this.supabase
      .getClient()
      .from('saved_jobs')
      .upsert(
        { user_id: user.id, job_id: jobId, saved_at: new Date().toISOString() },
        { onConflict: 'user_id,job_id' },
      );
    this.feedScoring.invalidateEngagement(user.id);
    return { ok: true };
  }

  @Delete(':job_id/save')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unsaveJob(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ ok: boolean }> {
    await this.supabase
      .getClient()
      .from('saved_jobs')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', jobId);
    this.feedScoring.invalidateEngagement(user.id);
    return { ok: true };
  }

  @Get(':job_id/similar')
  @OptionalAuth()
  async similarJobs(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser | null,
    @Query('limit') limit = '6',
  ): Promise<JobOfferResponseDto[]> {
    const lim = Math.min(Math.max(Number(limit) || 6, 1), 24);
    if (!this.typesense.isEnabled()) {
      return [];
    }
    let ids = await this.typesense.findSimilarJobIds(jobId, lim);
    if (ids.length < lim) {
      const { data: job } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('title,category')
        .eq('id', jobId)
        .maybeSingle();
      const j = job as { title?: string; category?: string | null } | null;
      if (j?.title) {
        const ts = await this.typesense.searchJobsTypesense({
          q: String(j.title),
          category: j.category ?? undefined,
          limit: lim + 4,
          offset: 0,
          sort: 'relevance',
          includeFacets: false,
        });
        if (ts && ts.ids.length > 0) {
          const have = new Set(ids);
          for (const id of ts.ids) {
            if (id === jobId) {
              continue;
            }
            if (!have.has(id)) {
              have.add(id);
              ids.push(id);
            }
            if (ids.length >= lim) {
              break;
            }
          }
        }
      }
    }
    ids = ids.filter((id) => id !== jobId).slice(0, lim);
    if (ids.length === 0) {
      return [];
    }
    const { data: rows } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(JOB_SEARCH_HYDRATE_SELECT)
      .in('id', ids)
      .eq('is_deleted', false)
      .eq('is_active', true);
    const list = mapRowsForViewer((rows ?? []) as JobRow[], user);
    return this.enrichJobsTopBadge(reorderJobsByIds(list, ids));
  }

  @Get(':job_id')
  @OptionalAuth()
  async getOne(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser | null,
  ): Promise<JobOfferResponseDto> {
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('*')
      .eq('id', jobId)
      .single();
    if (error || !data) {
      throw new NotFoundException('Job not found');
    }
    const row = data as JobRow & {
      is_deleted?: boolean;
      is_draft?: boolean;
      is_active?: boolean;
      company_id?: string;
    };
    if (row.is_deleted === true) {
      throw new NotFoundException('Job not found');
    }
    const isOwner = Boolean(user?.id && row.company_id === user.id);
    const isPublicVisible =
      row.is_active === true && row.is_draft !== true;
    let isApplicant = false;
    if (user?.id && !isOwner && !isPublicVisible) {
      const { data: appRow } = await this.supabase
        .getClient()
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('individual_id', user.id)
        .maybeSingle();
      isApplicant = Boolean(appRow);
    }
    if (!isOwner && !isPublicVisible && !isApplicant) {
      throw new NotFoundException('Job not found');
    }
    return this.enrichJobTopBadge(mapRowForViewer(row as JobRow, user));
  }

  @Patch(':job_id')
  @UseGuards(JwksAuthGuard)
  async update(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: JobOfferUpdateDto,
  ): Promise<JobOfferResponseDto> {
    const { data: existing } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('*')
      .eq('id', jobId)
      .single();
    if (
      !existing ||
      (existing as { company_id: string }).company_id !== user.id
    ) {
      throw new NotFoundException('Job not found');
    }
    const existingRow = existing as Record<string, unknown>;
    const willPublish =
      body.is_draft === false ||
      (body.is_active === true && existingRow.is_draft !== true) ||
      (body.is_active === true && body.is_draft !== true);
    const mergedForValidate = {
      title: body.title ?? existingRow.title,
      description: body.description ?? existingRow.description,
      category: body.category ?? existingRow.category,
      job_type: body.job_type ?? existingRow.job_type,
      employment_types: body.employment_types ?? existingRow.employment_types,
      requirements: body.requirements ?? existingRow.requirements,
      work_modes: body.work_modes ?? existingRow.work_modes,
      work_mode: body.work_mode ?? existingRow.work_mode,
      city: body.city ?? existingRow.city,
      location: body.location ?? existingRow.location,
      location_address:
        body.location_address ?? existingRow.location_address,
      salary_type: body.salary_type ?? existingRow.salary_type,
      salary_min: body.salary_min ?? existingRow.salary_min,
      salary_max: body.salary_max ?? existingRow.salary_max,
      salary_negotiable:
        body.salary_negotiable ?? existingRow.salary_negotiable,
      application_method:
        body.application_method ?? existingRow.application_method,
      contact_email: body.contact_email ?? existingRow.contact_email,
      contact_phone: body.contact_phone ?? existingRow.contact_phone,
      application_url: body.application_url ?? existingRow.application_url,
      application_deadline:
        body.application_deadline ?? existingRow.application_deadline,
      required_documents:
        body.required_documents ?? existingRow.required_documents,
      weekly_hours: body.weekly_hours ?? existingRow.weekly_hours,
      estimated_hours: body.estimated_hours ?? existingRow.estimated_hours,
      workers_needed: body.workers_needed ?? existingRow.workers_needed,
    };
    const wasDraft = existingRow.is_draft !== false;
    const wasPublic =
      existingRow.is_active === true && existingRow.is_draft !== true;
    const becomingPublic = willPublish && !wasPublic;

    if (willPublish) {
      validateJobForPublish(
        mergedForValidate as Parameters<typeof validateJobForPublish>[0],
        { isDraft: false },
      );
    }
    if (
      body.is_foreign !== undefined &&
      Boolean(body.is_foreign) !== Boolean(existingRow.is_foreign)
    ) {
      throw new BadRequestException(
        'Typ inzerátu (domáci / zahraničný) nie je možné po vytvorení zmeniť.',
      );
    }
    if (becomingPublic) {
      await this.limits.assertCanPublish(user.id, { excludeJobId: jobId });
    }
    // Explicit allowlist of fields that a job owner is permitted to PATCH.
    // The global ValidationPipe `whitelist: true` strips unknown DTO keys, but
    // this second layer (a) makes the contract explicit at the controller, (b)
    // documents which DTO fields are *intentionally* user-writable, and (c)
    // ensures sensitive future columns (e.g. company_id, owner billing flags)
    // can never reach the DB UPDATE even if a DTO field is added by mistake.
    const updates = pickJobUpdateFields(body) as Record<string, unknown>;
    if (body.description !== undefined) {
      updates.description = sanitizeRichTextHtml(body.description);
    }
    if (body.work_modes !== undefined || body.work_mode !== undefined) {
      const modes = (body.work_modes ??
        existingRow.work_modes ??
        []) as string[];
      const mapped = buildJobOfferRowFromBody(
        { ...body, work_modes: modes },
        {
          company_id: user.id,
          employer_email: null,
          employer_name: null,
          is_draft: body.is_draft === true,
        },
      );
      updates.work_mode = mapped.work_mode;
      updates.work_from_home = mapped.work_from_home;
    }
    if (
      body.salary_type !== undefined ||
      body.salary_min !== undefined ||
      body.salary_max !== undefined ||
      body.salary_negotiable !== undefined
    ) {
      const mapped = buildJobOfferRowFromBody(body, {
        company_id: user.id,
        employer_email: null,
        employer_name: null,
        is_draft: body.is_draft !== false,
      });
      if (body.salary === undefined) updates.salary = mapped.salary;
      if (body.compensation_type === undefined) {
        updates.compensation_type = mapped.compensation_type;
      }
      if (body.compensation_amount === undefined) {
        updates.compensation_amount = mapped.compensation_amount;
      }
    }
    if (body.required_documents !== undefined) {
      const mapped = buildJobOfferRowFromBody(body, {
        company_id: user.id,
        employer_email: null,
        employer_name: null,
        is_draft: true,
      });
      updates.required_documents = mapped.required_documents;
    }
    const keys = Object.keys(updates).filter((k) => updates[k] !== undefined);
    if (keys.length === 0) {
      const { data } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('*')
        .eq('id', jobId)
        .single();
      const row = (data ?? null) as JobRow | null;
      if (!row) {
        throw new NotFoundException('Job not found');
      }
      await this.tryApplyTopListingOnJobSave(
        user.id,
        jobId,
        body.want_top_listing,
        row,
        'job_update_top',
      );
      return this.enrichJobTopBadge(mapRowForViewer(row, user));
    }
    let spendRef: { refType: string; refId: string } | null = null;
    if (becomingPublic) {
      const urgentForCharge =
        body.is_urgent !== undefined
          ? Boolean(body.is_urgent)
          : Boolean(existingRow.is_urgent);
      spendRef = await this.chargeJobPublish(
        user.id,
        jobId,
        'job_publish',
        urgentForCharge,
      );
    }
    const updatePayload: Record<string, unknown> = {};
    for (const k of keys) updatePayload[k] = updates[k];
    if (becomingPublic) {
      updatePayload.is_draft = false;
      updatePayload.is_active = true;
    }
    let data: JobRow | null = null;
    let error: { message?: string } | null = null;
    try {
      const result = await this.supabase
        .getClient()
        .from('job_offers')
        .update(updatePayload)
        .eq('id', jobId)
        // Defense-in-depth: even though we already verified ownership on the
        // read above, scope the UPDATE by company_id so a future code path
        // that reaches this query without that read cannot cross-tenant edit.
        .eq('company_id', user.id)
        .select()
        .single();
      data = (result.data ?? null) as JobRow | null;
      error = result.error;
      if (error || !data) {
        throw new ForbiddenException('Update failed');
      }
    } catch (e) {
      if (spendRef) {
        await this.rollbackJobSpend(
          user.id,
          spendRef.refType,
          spendRef.refId,
          'job_publish_rollback',
        );
      }
      throw e;
    }
    const updatedRow = data as JobRow;
    await this.tryApplyTopListingOnJobSave(
      user.id,
      jobId,
      body.want_top_listing,
      updatedRow,
      becomingPublic ? 'job_publish_top' : 'job_update_top',
    );
    const updated = mapRowForViewer(updatedRow, user);
    void this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'job_offer.updated',
      subjectType: 'job_offer',
      subjectId: jobId,
      payload: { changed_fields: keys },
    });
    this.emitJobPublishedIfPublic(updated);
    void this.searchIndexing.indexJobById(updated.id);
    return this.enrichJobTopBadge(updated);
  }

  @Delete(':job_id')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ ok: boolean }> {
    const { data: existing } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id, company_id, is_deleted')
      .eq('id', jobId)
      .maybeSingle();
    if (!existing) {
      throw new NotFoundException('Job not found');
    }
    const row = existing as { company_id: string; is_deleted?: boolean };
    if (row.company_id !== user.id) {
      throw new ForbiddenException('Job not found');
    }
    if (row.is_deleted === true) {
      return { ok: true };
    }
    const { error } = await this.supabase
      .getClient()
      .from('job_offers')
      .update({ is_deleted: true, is_active: false })
      .eq('id', jobId)
      .eq('company_id', user.id);
    if (error) {
      throw new ForbiddenException('Delete failed');
    }
    void this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'job_offer.deleted',
      subjectType: 'job_offer',
      subjectId: jobId,
      payload: {},
    });
    void this.searchIndexing.indexJobById(jobId);
    return { ok: true };
  }

  @Post(':job_id/activate')
  @UseGuards(JwksAuthGuard)
  async activate(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ ok: boolean }> {
    const { data: existing, error: loadErr } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(
        'id, company_id, application_deadline, is_draft, is_active, is_urgent',
      )
      .eq('id', jobId)
      .eq('company_id', user.id)
      .maybeSingle();
    if (loadErr || !existing) {
      throw new NotFoundException('Job not found');
    }
    const ex = existing as {
      application_deadline?: string | null;
      is_draft?: boolean;
      is_active?: boolean;
      is_urgent?: boolean;
    };
    if (isApplicationDeadlinePassed(ex.application_deadline)) {
      throw new BadRequestException('Application deadline has passed');
    }
    const wasPublic = ex.is_active === true && ex.is_draft !== true;
    let spendRef: { refType: string; refId: string } | null = null;
    if (!wasPublic) {
      await this.limits.assertCanPublish(user.id, { excludeJobId: jobId });
      spendRef = await this.chargeJobPublish(
        user.id,
        jobId,
        'job_publish',
        Boolean(ex.is_urgent),
      );
    }
    let data: JobRow | null = null;
    let error: { message?: string } | null = null;
    try {
      const result = await this.supabase
        .getClient()
        .from('job_offers')
        .update({ is_active: true, is_draft: false })
        .eq('id', jobId)
        .eq('company_id', user.id)
        .select('*')
        .single();
      data = (result.data ?? null) as JobRow | null;
      error = result.error;
      if (error || !data) {
        throw new NotFoundException('Job not found');
      }
    } catch (e) {
      if (spendRef) {
        await this.rollbackJobSpend(
          user.id,
          spendRef.refType,
          spendRef.refId,
          'job_activate_rollback',
        );
      }
      throw e;
    }
    const activated = mapRowForViewer(data as JobRow, user);
    void this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'job_offer.activated',
      subjectType: 'job_offer',
      subjectId: jobId,
      payload: {},
    });
    this.emitJobPublishedIfPublic(activated);
    void this.searchIndexing.indexJobById(activated.id);
    return { ok: true };
  }

  @Post(':job_id/renew')
  @UseGuards(JwksAuthGuard)
  async renew(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: { want_top_listing?: boolean } = {},
  ): Promise<JobOfferResponseDto> {
    const { data: existing } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('*')
      .eq('id', jobId)
      .eq('company_id', user.id)
      .maybeSingle();
    if (!existing) {
      throw new NotFoundException('Job not found');
    }
    const spendRef = await this.chargeJobPublish(
      user.id,
      jobId,
      'renew_job',
      Boolean((existing as { is_urgent?: boolean }).is_urgent),
    );
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('job_offers')
        .update({
          is_active: true,
          is_draft: false,
        })
        .eq('id', jobId)
        .select()
        .single();
      if (error || !data) {
        throw new ForbiddenException('Renew failed');
      }
      await this.topPromotion.applyJobTopCategoryIfRequested(
        user.id,
        jobId,
        body.want_top_listing,
        'job_renew_top',
      );
      const renewed = mapRowForViewer(data as JobRow, user);
      this.emitJobPublishedIfPublic(renewed);
      void this.searchIndexing.indexJobById(renewed.id);
      return this.enrichJobTopBadge(renewed);
    } catch (e) {
      await this.rollbackJobSpend(
        user.id,
        spendRef.refType,
        spendRef.refId,
        'job_renew_rollback',
      );
      throw e;
    }
  }

  @Post(':job_id/top-listing')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async applyTopListing(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<JobOfferResponseDto> {
    const { data: existing } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id, company_id, is_draft, is_active')
      .eq('id', jobId)
      .eq('company_id', user.id)
      .maybeSingle();
    if (!existing) {
      throw new NotFoundException('Job not found');
    }
    const row = existing as {
      is_draft?: boolean | null;
      is_active?: boolean | null;
    };
    if (!isJobListingLiveForTop(row)) {
      throw new ForbiddenException('Najprv zverejnite ponuku.');
    }
    const topCost = await this.topPromotion.resolveTopListingCreditCost(user.id);
    const { credits } = await this.credits.getBalance(user.id);
    if (credits < topCost) {
      throw new ForbiddenException(
        `Na topovanie potrebujete aspoň ${topCost} kreditov. Kúpte kredity v sekcii Plány / kredity.`,
      );
    }
    const result = await this.topPromotion.applyJobTopCategoryIfRequested(
      user.id,
      jobId,
      true,
      'job_top_listing',
    );
    if (!result.applied) {
      const active = await this.topPromotion.getActiveTopJobIds([jobId]);
      if (!active.has(jobId)) {
        throw new ForbiddenException('Topovanie sa nepodarilo aktivovať.');
      }
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('*')
      .eq('id', jobId)
      .single();
    if (error || !data) {
      throw new ForbiddenException('Topovanie sa nepodarilo aktivovať.');
    }
    void this.searchIndexing.indexJobById(jobId);
    return this.enrichJobTopBadge(mapRowForViewer(data as JobRow, user));
  }

  @Post(':job_id/promote')
  @UseGuards(JwksAuthGuard)
  async promote(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: { kind: string },
  ): Promise<JobOfferResponseDto> {
    const kind = body.kind;
    const costMap: Record<string, 'urgentBadge7Days' | 'highlightedCard7Days' | 'topOfCategory7Days' | 'homepageFeatured7Days'> = {
      urgent_badge: 'urgentBadge7Days',
      highlighted_card: 'highlightedCard7Days',
      top_category: 'topOfCategory7Days',
      homepage_featured: 'homepageFeatured7Days',
    };
    const costKey = costMap[kind];
    if (!costKey) {
      throw new BadRequestException('Neplatný typ propagácie.');
    }
    const { data: existing } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('*')
      .eq('id', jobId)
      .eq('company_id', user.id)
      .maybeSingle();
    if (!existing) {
      throw new NotFoundException('Job not found');
    }
    const promoteRefId = `${jobId}:${kind}`;
    if (kind === 'top_category') {
      await this.topPromotion.applyJobTopCategoryIfRequested(
        user.id,
        jobId,
        true,
        kind,
      );
      const { data, error } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('*')
        .eq('id', jobId)
        .single();
      if (error || !data) {
        throw new ForbiddenException('Promotion failed');
      }
      void this.searchIndexing.indexJobById(jobId);
      return this.enrichJobTopBadge(mapRowForViewer(data as JobRow, user));
    }
    await this.credits.spendByKey(user.id, costKey, {
      reason: kind,
      refType: 'job_offer',
      refId: promoteRefId,
      subjectType: 'job_offer',
      subjectId: jobId,
    });
    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + 7);
    const patch: Record<string, unknown> = {};
    if (kind === 'urgent_badge') patch.is_urgent = true;
    if (kind === 'highlighted_card' || kind === 'homepage_featured') {
      patch.is_featured = true;
    }
    try {
      const { error: promoErr } = await this.supabase
        .getClient()
        .from('job_promotions')
        .insert({
          job_id: jobId,
          owner_id: user.id,
          kind,
          ends_at: ends.toISOString(),
          credits_spent: getCreditCost(costKey),
        });
      if (promoErr) {
        throw new ForbiddenException('Promotion failed');
      }
      const { data, error } = await this.supabase
        .getClient()
        .from('job_offers')
        .update(patch)
        .eq('id', jobId)
        .select()
        .single();
      if (error || !data) {
        throw new ForbiddenException('Promotion failed');
      }
      void this.searchIndexing.indexJobById(jobId);
      return this.enrichJobTopBadge(mapRowForViewer(data as JobRow, user));
    } catch (e) {
      await this.rollbackJobSpend(
        user.id,
        'job_offer',
        promoteRefId,
        'job_promote_rollback',
      );
      throw e;
    }
  }
}
