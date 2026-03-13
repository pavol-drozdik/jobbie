import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { FeedScoringService } from '../jobs/feed-scoring.service';
import { ApplicationCreateDto, ApplicationResponseDto } from './applications.dto';

@Controller('applications')
@UseGuards(JwksAuthGuard)
export class ApplicationsController {
  constructor(
    private supabase: SupabaseService,
    private feedScoring: FeedScoringService,
  ) {}

  @Post()
  async create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ApplicationCreateDto,
  ): Promise<ApplicationResponseDto> {
    const { data: job } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id, is_active')
      .eq('id', body.job_id)
      .single();
    if (!job || !(job as { is_active: boolean }).is_active) {
      throw new NotFoundException('Job not found or not active');
    }
    const { data: existing } = await this.supabase
      .getClient()
      .from('applications')
      .select('id')
      .eq('job_id', body.job_id)
      .eq('individual_id', user.id);
    if (Array.isArray(existing) && existing.length > 0) {
      throw new BadRequestException('Already applied to this job');
    }
    const row = {
      job_id: body.job_id,
      individual_id: user.id,
      status: 'pending',
      message: body.message ?? null,
    };
    const { data, error } = await this.supabase
      .getClient()
      .from('applications')
      .insert(row)
      .select()
      .single();
    if (error || !data) {
      throw new ForbiddenException('Failed to create application');
    }
    this.feedScoring.invalidateEngagement(user.id);
    return data as ApplicationResponseDto;
  }

  @Get()
  async list(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('job_id') jobId?: string,
    @Query('individual_id') individualId?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<ApplicationResponseDto[]> {
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Math.max(Number(offset) || 0, 0);
    let q = this.supabase
      .getClient()
      .from('applications')
      .select('*, job_offers (title)')
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);
    if (jobId) {
      const { data: job } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('company_id')
        .eq('id', jobId)
        .single();
      if (!job || (job as { company_id: string }).company_id !== user.id) {
        throw new ForbiddenException('Not your job');
      }
      q = q.eq('job_id', jobId);
    }
    if (individualId) {
      if (individualId !== user.id) {
        throw new ForbiddenException('Can only list own applications');
      }
      q = q.eq('individual_id', individualId);
    }
    const { data } = await q;
    const rows = (data ?? []) as (ApplicationResponseDto & { job_offers?: { title?: string } | null })[];
    return rows.map((row) => {
      const { job_offers, ...rest } = row;
      return { ...rest, job_title: job_offers?.title ?? undefined };
    });
  }

  @Get(':application_id')
  async getOne(
    @Param('application_id') applicationId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<ApplicationResponseDto> {
    const { data: app, error } = await this.supabase
      .getClient()
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    if (error || !app) {
      throw new NotFoundException('Application not found');
    }
    const a = app as ApplicationResponseDto;
    if (a.individual_id === user.id) return a;
    const { data: job } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('company_id')
      .eq('id', a.job_id)
      .single();
    if (job && (job as { company_id: string }).company_id === user.id) return a;
    throw new ForbiddenException('Not your application or job');
  }
}
