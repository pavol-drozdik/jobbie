import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getJobCategoryLabel } from '../common/job-categories.constants';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  CategoryBarPointDto,
  CustomerDashboardDto,
  DailyTimeSeriesPointDto,
  JobStatsResponseDto,
  MetricScalarDto,
  ProviderBenchmarkDto,
  ProviderDashboardDto,
  TimeSeriesPointDto,
} from './analytics.dto';

const DEFAULT_RANGE_MS = 180 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Switch from month buckets to day buckets when the span is at most this many days. */
const DAY_BUCKET_MAX_DAYS = 31;

type DateRange = { from: Date; to: Date; fromIso: string; toIso: string };
type BucketGranularity = 'day' | 'month';

/**
 * Dashboard metrics rules (pairwise reviews = all ratings where user is reviewee;
 * not job-scoped). Completion rate insufficient until job_offers has completed/cancelled fields.
 * Conversion proxy: distinct chat_rooms.individual_id (contacts) / profile_views in range, capped at 100%.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  private parseRange(
    fromRaw?: string,
    toRaw?: string,
  ): DateRange {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw
      ? new Date(fromRaw)
      : new Date(to.getTime() - DEFAULT_RANGE_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      const now = new Date();
      const f = new Date(now.getTime() - DEFAULT_RANGE_MS);
      return { from: f, to: now, fromIso: f.toISOString(), toIso: now.toISOString() };
    }
    return { from, to, fromIso: from.toISOString(), toIso: to.toISOString() };
  }

  private emptyMetric(): MetricScalarDto {
    return { insufficientData: true };
  }

  private metricValue(v: number, insufficient: boolean): MetricScalarDto {
    return insufficient ? { insufficientData: true } : { insufficientData: false, value: v };
  }

  private monthKey(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private dayKey(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private eachMonth(from: Date, to: Date): string[] {
    const keys: string[] = [];
    const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    while (cur <= end) {
      keys.push(this.monthKey(cur));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return keys;
  }

  private eachDay(from: Date, to: Date): string[] {
    const keys: string[] = [];
    const cur = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
    const end = new Date(
      Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
    );
    while (cur <= end) {
      keys.push(this.dayKey(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return keys;
  }

  private bucketGranularity(range: DateRange): BucketGranularity {
    const spanDays = (range.to.getTime() - range.from.getTime()) / DAY_MS;
    return spanDays <= DAY_BUCKET_MAX_DAYS ? 'day' : 'month';
  }

  private bucketLabels(range: DateRange, granularity: BucketGranularity): string[] {
    return granularity === 'day'
      ? this.eachDay(range.from, range.to)
      : this.eachMonth(range.from, range.to);
  }

  private bucketKeyForDate(d: Date, granularity: BucketGranularity): string {
    return granularity === 'day' ? this.dayKey(d) : this.monthKey(d);
  }

  /** Emit legacy `month` + new `label` so the PWA can migrate without a breaking change. */
  private toTimeSeries(
    labels: string[],
    values: Map<string, number>,
  ): TimeSeriesPointDto[] {
    return labels.map((label) => {
      const v = values.get(label) ?? 0;
      return { label, month: label, value: v };
    });
  }

  private async avgRatingForReviewee(
    revieweeId: string,
    fromIso: string,
    toIso: string,
  ): Promise<{ avg: number; count: number }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('rating,created_at')
      .eq('reviewee_id', revieweeId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    if (error || !data?.length) return { avg: 0, count: 0 };
    const rows = data as { rating: number }[];
    const sum = rows.reduce((s, r) => s + r.rating, 0);
    return {
      avg: Math.round((sum / rows.length) * 10) / 10,
      count: rows.length,
    };
  }

  async recordProfileView(
    viewerId: string,
    viewedProfileId: string,
  ): Promise<void> {
    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id')
      .eq('id', viewedProfileId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (!profile) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    const { error } = await this.supabase.getClient().from('profile_views').insert({
      viewed_profile_id: viewedProfileId,
      viewer_id: viewerId,
    });
    if (error) {
      throw new BadRequestException(`Záznam zobrazenia sa nepodarilo uložiť.`);
    }
  }

  async getCustomerDashboard(
    userId: string,
    fromRaw?: string,
    toRaw?: string,
  ): Promise<CustomerDashboardDto> {
    const range = this.parseRange(fromRaw, toRaw);
    const { fromIso, toIso } = range;

    const { data: jobsInPeriod } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id,category,created_at')
      .eq('company_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    const jobs = (jobsInPeriod ?? []) as { id: string; category: string | null }[];
    const jobIds = jobs.map((j) => j.id);

    let avgApplicants: MetricScalarDto = this.emptyMetric();
    if (jobIds.length > 0) {
      const { data: apps } = await this.supabase
        .getClient()
        .from('applications')
        .select('id')
        .in('job_id', jobIds)
        .eq('is_deleted', false);
      const appCount = Array.isArray(apps) ? apps.length : 0;
      avgApplicants = this.metricValue(appCount / jobIds.length, false);
    }

    const ratingStats = await this.avgRatingForReviewee(userId, fromIso, toIso);
    const avgRating: MetricScalarDto =
      ratingStats.count > 0
        ? { insufficientData: false, value: ratingStats.avg }
        : this.emptyMetric();

    const { data: acceptedRows } = await this.supabase
      .getClient()
      .from('applications')
      .select('updated_at,created_at,job_id')
      .eq('status', 'accepted')
      .eq('is_deleted', false)
      .gte('updated_at', fromIso)
      .lte('updated_at', toIso);
    const accepted = (acceptedRows ?? []) as {
      updated_at: string;
      created_at: string;
      job_id: string;
    }[];
    let avgTimeToHireDays: MetricScalarDto = this.emptyMetric();
    if (accepted.length > 0) {
      const { data: jobRows } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('id,created_at,company_id')
        .in(
          'id',
          accepted.map((a) => a.job_id),
        )
        .eq('company_id', userId)
        .eq('is_deleted', false);
      const jobCreated = new Map<string, string>();
      for (const j of (jobRows ?? []) as { id: string; created_at: string }[]) {
        jobCreated.set(j.id, j.created_at);
      }
      const daysList: number[] = [];
      for (const a of accepted) {
        const jc = jobCreated.get(a.job_id);
        if (!jc) continue;
        const acceptT = new Date(a.updated_at).getTime();
        const jobT = new Date(jc).getTime();
        if (acceptT >= jobT) {
          daysList.push((acceptT - jobT) / (24 * 60 * 60 * 1000));
        }
      }
      if (daysList.length > 0) {
        const avgDays =
          Math.round((daysList.reduce((s, d) => s + d, 0) / daysList.length) * 10) /
          10;
        avgTimeToHireDays = { insufficientData: false, value: avgDays };
      }
    }

    const categoryMap = new Map<string, number>();
    for (const j of jobs) {
      const raw = j.category?.trim();
      const label = raw ? getJobCategoryLabel(raw) : 'Nešpecifikované';
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + 1);
    }
    const barCategories: CategoryBarPointDto[] = [...categoryMap.entries()].map(
      ([label, count]) => ({ label, count }),
    );

    const { data: myJobIdsRow } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id')
      .eq('company_id', userId)
      .eq('is_deleted', false);
    const allJobIds = ((myJobIdsRow ?? []) as { id: string }[]).map((r) => r.id);
    const applicantBuckets = new Map<string, number>();
    const ratingBuckets = new Map<string, { sum: number; n: number }>();
    const granularity = this.bucketGranularity(range);
    const bucketKeys = this.bucketLabels(range, granularity);

    if (allJobIds.length > 0) {
      const { data: appsTimed } = await this.supabase
        .getClient()
        .from('applications')
        .select('created_at')
        .in('job_id', allJobIds)
        .eq('is_deleted', false)
        .gte('created_at', fromIso)
        .lte('created_at', toIso);
      for (const row of (appsTimed ?? []) as { created_at: string }[]) {
        const k = this.bucketKeyForDate(new Date(row.created_at), granularity);
        applicantBuckets.set(k, (applicantBuckets.get(k) ?? 0) + 1);
      }
    }

    const { data: reviewsTimed } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('rating,created_at')
      .eq('reviewee_id', userId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    for (const row of (reviewsTimed ?? []) as {
      rating: number;
      created_at: string;
    }[]) {
      const k = this.bucketKeyForDate(new Date(row.created_at), granularity);
      const cur = ratingBuckets.get(k) ?? { sum: 0, n: 0 };
      cur.sum += row.rating;
      cur.n += 1;
      ratingBuckets.set(k, cur);
    }

    const lineApplicants = this.toTimeSeries(bucketKeys, applicantBuckets);
    const ratingAverages = new Map<string, number>();
    for (const [k, v] of ratingBuckets.entries()) {
      if (v.n > 0) ratingAverages.set(k, Math.round((v.sum / v.n) * 10) / 10);
    }
    const lineRating = this.toTimeSeries(bucketKeys, ratingAverages);

    return {
      meta: { from: fromIso, to: toIso },
      simple: {
        avgApplicantsPerListing: avgApplicants,
        avgRating,
      },
      complex: {
        avgTimeToHireDays,
        barCategories,
        lineApplicants,
        lineRating,
      },
    };
  }

  async getProviderDashboard(
    userId: string,
    fromRaw?: string,
    toRaw?: string,
  ): Promise<ProviderDashboardDto> {
    const range = this.parseRange(fromRaw, toRaw);
    const { fromIso, toIso } = range;
    const granularity = this.bucketGranularity(range);
    const bucketKeys = this.bucketLabels(range, granularity);

    const { count: viewCount } = await this.supabase
      .getClient()
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('viewed_profile_id', userId)
      .gte('viewed_at', fromIso)
      .lte('viewed_at', toIso);
    const viewsNum = viewCount ?? 0;

    const { data: rooms } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('individual_id,created_at')
      .eq('company_id', userId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    const roomRows = (rooms ?? []) as {
      individual_id: string;
      created_at: string;
    }[];
    const distinctContacts = new Set(roomRows.map((r) => r.individual_id)).size;

    let conversionRate: MetricScalarDto = this.emptyMetric();
    if (viewsNum > 0) {
      const raw = distinctContacts / viewsNum;
      conversionRate = {
        insufficientData: false,
        value: Math.round(Math.min(raw, 1) * 1000) / 10,
      };
    } else {
      conversionRate = { insufficientData: true, reason: 'no_views' };
    }

    const periodRating = await this.avgRatingForReviewee(userId, fromIso, toIso);
    const allTimeRating = await this.allTimeRating(userId);
    let avgRating: MetricScalarDto;
    if (periodRating.count > 0) {
      avgRating = { insufficientData: false, value: periodRating.avg };
    } else if (allTimeRating.count > 0) {
      avgRating = {
        insufficientData: false,
        value: allTimeRating.avg,
        reason: 'all_time',
      };
    } else {
      avgRating = { insufficientData: true, reason: 'no_reviews' };
    }

    const viewBuckets = new Map<string, number>();
    const { data: viewsRows } = await this.supabase
      .getClient()
      .from('profile_views')
      .select('viewed_at')
      .eq('viewed_profile_id', userId)
      .gte('viewed_at', fromIso)
      .lte('viewed_at', toIso);
    for (const row of (viewsRows ?? []) as { viewed_at: string }[]) {
      const k = this.bucketKeyForDate(new Date(row.viewed_at), granularity);
      viewBuckets.set(k, (viewBuckets.get(k) ?? 0) + 1);
    }

    const contactBuckets = new Map<string, number>();
    for (const row of roomRows) {
      const k = this.bucketKeyForDate(new Date(row.created_at), granularity);
      contactBuckets.set(k, (contactBuckets.get(k) ?? 0) + 1);
    }

    const lineViews = this.toTimeSeries(bucketKeys, viewBuckets);
    const lineContacts = this.toTimeSeries(bucketKeys, contactBuckets);

    const ratingBuckets = new Map<string, { sum: number; n: number }>();
    const { data: reviewsTimed } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('rating,created_at')
      .eq('reviewee_id', userId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    for (const row of (reviewsTimed ?? []) as {
      rating: number;
      created_at: string;
    }[]) {
      const k = this.bucketKeyForDate(new Date(row.created_at), granularity);
      const cur = ratingBuckets.get(k) ?? { sum: 0, n: 0 };
      cur.sum += row.rating;
      cur.n += 1;
      ratingBuckets.set(k, cur);
    }
    const ratingAverages = new Map<string, number>();
    for (const [k, v] of ratingBuckets.entries()) {
      if (v.n > 0) ratingAverages.set(k, Math.round((v.sum / v.n) * 10) / 10);
    }
    const lineRating = this.toTimeSeries(bucketKeys, ratingAverages);

    const { data: profileRow } = await this.supabase
      .getClient()
      .from('profiles')
      .select('sector')
      .eq('id', userId)
      .maybeSingle();
    const sectorRaw = (profileRow as { sector: string | null } | null)?.sector;
    const sectorNorm = sectorRaw?.trim().toLowerCase() ?? '';
    const barTopCategories = await this.providerBarTopCategories(
      userId,
      fromIso,
      toIso,
      sectorRaw,
    );

    const benchmarkRating =
      periodRating.count > 0 ? periodRating : allTimeRating;
    const benchmark = await this.providerBenchmark(
      userId,
      sectorNorm,
      benchmarkRating.avg,
      benchmarkRating.count,
    );

    return {
      meta: { from: fromIso, to: toIso },
      simple: {
        profileViews: this.metricValue(viewsNum, false),
        conversionRate,
        avgRating,
      },
      complex: {
        barTopCategories,
        lineViews,
        lineContacts,
        lineRating,
        benchmark,
      },
    };
  }

  private async allTimeRating(
    revieweeId: string,
  ): Promise<{ avg: number; count: number }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);
    if (error || !data?.length) return { avg: 0, count: 0 };
    const rows = data as { rating: number }[];
    const sum = rows.reduce((s, r) => s + r.rating, 0);
    return {
      avg: Math.round((sum / rows.length) * 10) / 10,
      count: rows.length,
    };
  }

  async getJobStats(
    ownerId: string,
    jobId: string,
    fromRaw?: string,
    toRaw?: string,
  ): Promise<JobStatsResponseDto> {
    const range = this.parseRange(fromRaw, toRaw);
    const { fromIso, toIso } = range;
    const { data: jobRow } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id,title,company_id,is_deleted,created_at')
      .eq('id', jobId)
      .maybeSingle();
    const job = jobRow as
      | { id: string; title: string; company_id: string; is_deleted: boolean; created_at: string }
      | null;
    if (!job || job.is_deleted || job.company_id !== ownerId) {
      throw new NotFoundException('Ponuka nebola nájdená');
    }
    const dayKeys = this.eachDay(range.from, range.to);

    const { data: appsRows } = await this.supabase
      .getClient()
      .from('applications')
      .select('id,created_at,status,updated_at')
      .eq('job_id', jobId)
      .eq('is_deleted', false)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    const apps = (appsRows ?? []) as {
      created_at: string;
      status: string;
      updated_at: string;
    }[];
    const applicantsCount = apps.length;
    const applicantsByDay = new Map<string, number>();
    for (const row of apps) {
      const k = this.dayKey(new Date(row.created_at));
      applicantsByDay.set(k, (applicantsByDay.get(k) ?? 0) + 1);
    }
    const lineApplicants: DailyTimeSeriesPointDto[] = dayKeys.map((day) => ({
      day,
      value: applicantsByDay.get(day) ?? 0,
    }));

    const { data: viewRows } = await this.supabase
      .getClient()
      .from('job_views')
      .select('user_id,viewed_at')
      .eq('job_id', jobId)
      .gte('viewed_at', fromIso)
      .lte('viewed_at', toIso);
    const uniqueViewersCount = new Set(
      ((viewRows ?? []) as { user_id: string }[]).map((r) => r.user_id),
    ).size;

    const { data: impressionRows } = await this.supabase
      .getClient()
      .from('job_impressions')
      .select('user_id')
      .eq('job_id', jobId)
      .gte('shown_at', fromIso)
      .lte('shown_at', toIso);
    const impressions = new Set(
      ((impressionRows ?? []) as { user_id: string }[]).map((r) => r.user_id),
    ).size;

    let conversionRate: MetricScalarDto = this.emptyMetric();
    if (uniqueViewersCount > 0) {
      const ratio = applicantsCount / uniqueViewersCount;
      conversionRate = {
        insufficientData: false,
        value: Math.round(Math.min(ratio, 1) * 1000) / 10,
      };
    }

    const acceptedDurations: number[] = [];
    const jobCreatedAt = new Date(job.created_at).getTime();
    for (const a of apps) {
      if (a.status !== 'accepted') continue;
      const acceptedAt = new Date(a.updated_at).getTime();
      if (!Number.isNaN(acceptedAt) && acceptedAt >= jobCreatedAt) {
        acceptedDurations.push((acceptedAt - jobCreatedAt) / DAY_MS);
      }
    }
    let avgTimeToHireDays: MetricScalarDto = this.emptyMetric();
    if (acceptedDurations.length > 0) {
      const avg =
        acceptedDurations.reduce((s, d) => s + d, 0) / acceptedDurations.length;
      avgTimeToHireDays = {
        insufficientData: false,
        value: Math.round(avg * 10) / 10,
      };
    }

    return {
      meta: { from: fromIso, to: toIso, jobId: job.id, jobTitle: job.title },
      simple: {
        applicants: this.metricValue(applicantsCount, false),
        uniqueViewers: this.metricValue(uniqueViewersCount, false),
        impressions: this.metricValue(impressions, false),
        conversionRate,
      },
      complex: {
        avgTimeToHireDays,
        lineApplicants,
      },
    };
  }

  private async providerBarTopCategories(
    userId: string,
    fromIso: string,
    toIso: string,
    sectorRaw: string | null | undefined,
  ): Promise<CategoryBarPointDto[]> {
    const { data: adRows } = await this.supabase
      .getClient()
      .from('company_ads')
      .select('category')
      .eq('owner_id', userId)
      .eq('status', 'active')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    const categoryMap = new Map<string, number>();
    for (const row of (adRows ?? []) as { category: string }[]) {
      const raw = row.category?.trim();
      const label = raw ? getJobCategoryLabel(raw) : 'Nešpecifikované';
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + 1);
    }
    if (categoryMap.size > 0) {
      return [...categoryMap.entries()].map(([label, count]) => ({ label, count }));
    }
    const sector = sectorRaw?.trim();
    if (sector && sector.length > 0) {
      return [{ label: sector, count: 1 }];
    }
    return [{ label: 'Nešpecifikované', count: 1 }];
  }

  private async providerBenchmark(
    userId: string,
    sectorNorm: string,
    yourAvg: number,
    yourCount: number,
  ): Promise<ProviderBenchmarkDto> {
    if (!sectorNorm) {
      return { insufficientData: true, reason: 'no_sector' };
    }
    if (yourCount === 0) {
      return { insufficientData: true, reason: 'no_reviews' };
    }
    const { data: allProfiles } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id,sector')
      .eq('provider_role', true)
      .eq('is_deleted', false)
      .neq('id', userId);
    const peerIds = ((allProfiles ?? []) as { id: string; sector: string | null }[])
      .filter(
        (p) => (p.sector?.trim().toLowerCase() ?? '') === sectorNorm,
      )
      .map((p) => p.id);
    if (peerIds.length === 0) {
      return { insufficientData: true, reason: 'no_peers' };
    }
    const { data: revs } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('rating')
      .in('reviewee_id', peerIds);
    const ratings = (revs ?? []) as { rating: number }[];
    if (ratings.length === 0) {
      return { insufficientData: true, reason: 'no_peers' };
    }
    const sum = ratings.reduce((s, r) => s + r.rating, 0);
    const catAvg = Math.round((sum / ratings.length) * 10) / 10;
    return {
      insufficientData: false,
      yourAverage: yourAvg,
      categoryAverage: catAvg,
    };
  }
}
