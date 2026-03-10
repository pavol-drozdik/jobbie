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
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { OptionalJwksAuthGuard } from '../auth/optional-jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { JobsService } from './jobs.service';
import {
  FeedScoringService,
  type JobForScore,
} from './feed-scoring.service';
import {
  JobOfferCreateDto,
  JobOfferUpdateDto,
  JobOfferResponseDto,
} from './jobs.dto';

type JobRow = Record<string, unknown> & {
  photos?: unknown;
  applications_count?: number;
};

function toResponse(row: JobRow | null): JobOfferResponseDto {
  if (!row) throw new NotFoundException('Job not found');
  const photos = row.photos;
  const photosArr = Array.isArray(photos)
    ? photos
    : typeof photos === 'object' && photos !== null
      ? []
      : [];
  return {
    ...row,
    photos: photosArr as string[],
    applications_count: Number(row.applications_count) || 0,
  } as JobOfferResponseDto;
}

@Controller('jobs')
export class JobsController {
  constructor(
    private supabase: SupabaseService,
    private jobsService: JobsService,
    private feedScoring: FeedScoringService,
  ) {}

  /** List jobs. When user is logged in, order by rule-based score (see FeedScoringService). */
  @Get()
  @UseGuards(OptionalJwksAuthGuard)
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
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<JobOfferResponseDto[]> {
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Math.max(Number(offset) || 0, 0);
    const filterByMy = my === 'true';
    const effectiveCompanyId =
      filterByMy && user ? user.id : companyId;

    let query = this.supabase
      .getClient()
      .from('job_offers')
      .select('*')
      .eq('is_deleted', false);

    if (effectiveCompanyId) {
      query = query.eq('company_id', effectiveCompanyId);
    }
    if (isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
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

    const { data: rows } = await query
      .order('created_at', { ascending: false })
      .limit(300);

    let list = (rows ?? []) as JobRow[];

    if (q && q.trim()) {
      const lower = q.toLowerCase().trim();
      list = list.filter(
        (j) =>
          (j.title && String(j.title).toLowerCase().includes(lower)) ||
          (j.description && String(j.description).toLowerCase().includes(lower)) ||
          (j.location && String(j.location).toLowerCase().includes(lower)) ||
          (j.location_address &&
            String(j.location_address).toLowerCase().includes(lower)),
      );
    }

    if (minHourlyWage) {
      const min = parseFloat(minHourlyWage);
      if (!Number.isNaN(min)) {
        list = list.filter((j) => {
          if (j.compensation_type !== 'hourly') return true;
          const amt = Number(j.compensation_amount);
          return !Number.isNaN(amt) && amt >= min;
        });
      }
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
      list = list.filter((j) => {
        const created = new Date((j.created_at as string) ?? 0).getTime();
        return now - created <= maxAge;
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

    const paginated = list.slice(offsetNum, offsetNum + limitNum);
    return paginated.map((row) => toResponse(row));
  }

  @Post('impressions')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async recordImpressions(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: { job_ids?: string[] },
  ): Promise<{ ok: boolean }> {
    const jobIds = Array.isArray(body?.job_ids) ? body.job_ids : [];
    if (jobIds.length === 0) return { ok: true };
    const now = new Date().toISOString();
    const rows = jobIds.map((job_id: string) => ({
      user_id: user.id,
      job_id,
      shown_at: now,
    }));
    await this.supabase
      .getClient()
      .from('job_impressions')
      .insert(rows);
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
      .select('*')
      .in('id', jobIds)
      .eq('is_deleted', false);
    const order = new Map(jobIds.map((id, i) => [id, i]));
    const list = ((rows ?? []) as JobRow[]).sort(
      (a, b) => (order.get(a.id as string) ?? 0) - (order.get(b.id as string) ?? 0),
    );
    return list.map((row) => toResponse(row));
  }

  @Post()
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: JobOfferCreateDto,
  ): Promise<JobOfferResponseDto> {
    const { data: profileRow } = await this.supabase
      .getClient()
      .from('profiles')
      .select('offering_work')
      .eq('id', user.id)
      .single();
    const offeringWork = (profileRow as { offering_work?: boolean } | null)
      ?.offering_work;
    if (!offeringWork) {
      throw new ForbiddenException(
        'Ak chcete zverejňovať ponuky, povolte "Ponúkam prácu" v profile.',
      );
    }

    const isDraft = body.is_draft ?? true;
    if (!isDraft) {
      const { data: countData } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('id')
        .eq('company_id', user.id)
        .eq('is_active', true)
        .eq('is_deleted', false);
      const count = (countData ?? []).length;
      const maxJobs = await this.jobsService.getMaxActiveJobs(user.id);
      if (count >= maxJobs) {
        throw new ForbiddenException(
          'Nemáte predplatné na ďalší aktívny inzerát. Zvoľte vyšší plán.',
        );
      }
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
      company_id: user.id,
      title: body.title,
      description: body.description,
      location: body.location ?? body.location_address ?? null,
      location_address: body.location_address ?? body.location ?? null,
      location_lat: body.location_lat ?? null,
      location_lng: body.location_lng ?? null,
      contract_type: body.contract_type ?? null,
      requirements: body.requirements ?? null,
      salary: body.salary ?? null,
      job_type: body.job_type ?? null,
      expires_at: body.expires_at ?? null,
      application_deadline: body.application_deadline ?? null,
      completion_deadline: body.completion_deadline ?? null,
      is_draft: isDraft,
      is_active: !isDraft,
      category: body.category ?? null,
      is_urgent: body.is_urgent ?? false,
      is_featured: body.is_featured ?? false,
      compensation_type: body.compensation_type ?? null,
      compensation_amount: body.compensation_amount ?? null,
      workers_needed: body.workers_needed ?? 1,
      employer_email: user.email ?? null,
      employer_name: employerName,
      photos: body.photos ?? [],
      applications_count: 0,
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
    return toResponse(data as JobRow);
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

  @Get(':job_id')
  @UseGuards(JwksAuthGuard)
  async getOne(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() _user: CurrentUser,
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
    return toResponse(data as JobRow);
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
      .select('company_id')
      .eq('id', jobId)
      .single();
    if (
      !existing ||
      (existing as { company_id: string }).company_id !== user.id
    ) {
      throw new NotFoundException('Job not found');
    }
    const updates = { ...body } as Record<string, unknown>;
    const keys = Object.keys(updates).filter((k) => updates[k] !== undefined);
    if (keys.length === 0) {
      const { data } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('*')
        .eq('id', jobId)
        .single();
      return toResponse((data ?? null) as JobRow);
    }
    const updatePayload: Record<string, unknown> = {};
    for (const k of keys) updatePayload[k] = updates[k];
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .update(updatePayload)
      .eq('id', jobId)
      .select()
      .single();
    if (error || !data) {
      throw new ForbiddenException('Update failed');
    }
    return toResponse(data as JobRow);
  }

  @Post(':job_id/activate')
  @UseGuards(JwksAuthGuard)
  async activate(
    @Param('job_id') jobId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ ok: boolean }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .update({ is_active: true })
      .eq('id', jobId)
      .eq('company_id', user.id)
      .select();
    if (error || !data || (data as unknown[]).length === 0) {
      throw new NotFoundException('Job not found');
    }
    return { ok: true };
  }
}
