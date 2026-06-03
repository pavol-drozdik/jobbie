import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';
import { ExternalAnalyticsService } from './external/external-analytics.service';

@Controller('admin/analytics')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireAppRoles('admin')
export class AdminAnalyticsController {
  constructor(
    private readonly adminAnalytics: AdminAnalyticsService,
    private readonly externalAnalytics: ExternalAnalyticsService,
  ) {}

  /**
   * Platform KPIs: funnel, MRR/ARR, cohorts, timeseries, marketplace, users, revenue period,
   * sampled API latency, search analytics (service_role; no SEARCH_ANALYTICS_SECRET required).
   */
  @Get('summary')
  async summary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cohort_weeks') cohortWeeksRaw?: string,
    @Query('search_days') searchDaysRaw?: string,
  ): Promise<ReturnType<AdminAnalyticsService['getSummary']>> {
    return this.adminAnalytics.getSummary({
      fromIso: from?.trim() || undefined,
      toIso: to?.trim() || undefined,
      cohortWeeks: Number(cohortWeeksRaw) || undefined,
      searchDays: Number(searchDaysRaw) || undefined,
    });
  }

  /** PostHog, GA4, Clarity, Search Console (optional env credentials). */
  @Get('external')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async external(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ReturnType<ExternalAnalyticsService['getExternalSummary']>> {
    return this.externalAnalytics.getExternalSummary({
      fromIso: from?.trim() || undefined,
      toIso: to?.trim() || undefined,
    });
  }

  /** Quick connectivity check per configured external provider (7-day window). */
  @Get('external/test')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async externalTest(): Promise<{
    ok: boolean;
    providers: Record<string, { ok: boolean; error?: string }>;
  }> {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const summary = await this.externalAnalytics.getExternalSummary({
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    });
    const providers: Record<string, { ok: boolean; error?: string }> = {};
    for (const key of ['posthog', 'ga4', 'clarity', 'gsc'] as const) {
      const configured = summary.configured[key];
      const err = summary.errors[key];
      if (!configured) {
        providers[key] = { ok: false, error: 'not_configured' };
      } else if (err) {
        providers[key] = { ok: false, error: err };
      } else {
        providers[key] = { ok: true };
      }
    }
    const ok = Object.values(providers).some((p) => p.ok);
    return { ok, providers };
  }
}
