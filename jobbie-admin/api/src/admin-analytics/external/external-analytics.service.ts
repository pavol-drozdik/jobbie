import { Injectable } from '@nestjs/common';
import { parseAnalyticsDateRange } from '../analytics-date-range.util';
import type { ExternalAnalyticsSummaryDto } from './external-analytics.dto';
import {
  clarityDashboardLink,
  fetchClarityMetrics,
  isClarityConfigured,
} from './clarity.provider';
import {
  fetchGa4Metrics,
  ga4DashboardLink,
  isGoogleAnalyticsConfigured,
} from './ga4.provider';
import {
  fetchGscMetrics,
  gscDashboardLink,
  isGscConfigured,
} from './gsc.provider';
import {
  fetchPosthogMetrics,
  isPosthogConfigured,
  posthogDashboardLink,
} from './posthog.provider';

@Injectable()
export class ExternalAnalyticsService {
  async getExternalSummary(options: {
    readonly fromIso?: string;
    readonly toIso?: string;
  }): Promise<ExternalAnalyticsSummaryDto> {
    const { fromIso, toIso } = parseAnalyticsDateRange(
      options.fromIso,
      options.toIso,
    );

    const warnings: string[] = [];
    const errors: ExternalAnalyticsSummaryDto['errors'] = {};

    const configured = {
      posthog: isPosthogConfigured(),
      ga4: isGoogleAnalyticsConfigured(),
      clarity: isClarityConfigured(),
      gsc: isGscConfigured(),
    };

    const [posthogSettled, ga4Settled, claritySettled, gscSettled] =
      await Promise.allSettled([
        configured.posthog
          ? fetchPosthogMetrics(fromIso, toIso)
          : Promise.resolve(null),
        configured.ga4 ? fetchGa4Metrics(fromIso, toIso) : Promise.resolve(null),
        configured.clarity
          ? fetchClarityMetrics({ fromIso, toIso, warnings })
          : Promise.resolve(null),
        configured.gsc ? fetchGscMetrics(fromIso, toIso) : Promise.resolve(null),
      ]);

    const unwrap = <T>(
      result: PromiseSettledResult<T | null>,
      key: keyof ExternalAnalyticsSummaryDto['errors'],
    ): T | null => {
      if (result.status === 'fulfilled') return result.value;
      errors[key] =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      return null;
    };

    return {
      meta: { from: fromIso, to: toIso },
      configured,
      posthog: unwrap(posthogSettled, 'posthog'),
      ga4: unwrap(ga4Settled, 'ga4'),
      clarity: unwrap(claritySettled, 'clarity'),
      gsc: unwrap(gscSettled, 'gsc'),
      warnings,
      errors,
      dashboard_links: {
        posthog: posthogDashboardLink(),
        ga4: ga4DashboardLink(),
        clarity: clarityDashboardLink(),
        gsc: gscDashboardLink(),
      },
    };
  }
}
