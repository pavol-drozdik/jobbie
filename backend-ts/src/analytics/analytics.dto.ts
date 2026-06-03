import { IsUUID } from 'class-validator';

/** Single numeric metric with insufficient-data flag for dashboard cards. */
export class MetricScalarDto {
  insufficientData!: boolean;
  value?: number;
  /** Optional UI hint when insufficientData is true */
  reason?: string;
}

/**
 * Generic labelled time series point. For month buckets `label` is `YYYY-MM`,
 * for day buckets it is `YYYY-MM-DD`. `month` is kept for legacy consumers.
 */
export class TimeSeriesPointDto {
  label!: string;
  /** @deprecated use label */
  month!: string;
  value!: number;
}

export class DailyTimeSeriesPointDto {
  day!: string;
  value!: number;
}

export class CategoryBarPointDto {
  label!: string;
  count!: number;
}

export class CustomerDashboardDto {
  meta!: { from: string; to: string };
  simple!: {
    avgApplicantsPerListing: MetricScalarDto;
    avgRating: MetricScalarDto;
  };
  complex!: {
    avgTimeToHireDays: MetricScalarDto;
    barCategories: CategoryBarPointDto[];
    lineApplicants: TimeSeriesPointDto[];
    lineRating: TimeSeriesPointDto[];
  };
}

export type ProviderBenchmarkReason = 'no_sector' | 'no_reviews' | 'no_peers';

export class ProviderBenchmarkDto {
  insufficientData!: boolean;
  reason?: ProviderBenchmarkReason;
  yourAverage?: number;
  categoryAverage?: number;
}

export class ProviderDashboardDto {
  meta!: { from: string; to: string };
  simple!: {
    profileViews: MetricScalarDto;
    conversionRate: MetricScalarDto;
    avgRating: MetricScalarDto;
  };
  complex!: {
    barTopCategories: CategoryBarPointDto[];
    lineViews: TimeSeriesPointDto[];
    lineContacts: TimeSeriesPointDto[];
    lineRating: TimeSeriesPointDto[];
    benchmark: ProviderBenchmarkDto;
  };
}

export class ProfileViewBodyDto {
  @IsUUID('4')
  viewedProfileId!: string;
}

export class JobStatsResponseDto {
  meta!: { from: string; to: string; jobId: string; jobTitle: string };
  simple!: {
    applicants: MetricScalarDto;
    uniqueViewers: MetricScalarDto;
    impressions: MetricScalarDto;
    conversionRate: MetricScalarDto;
  };
  complex!: {
    avgTimeToHireDays: MetricScalarDto;
    lineApplicants: DailyTimeSeriesPointDto[];
  };
}
