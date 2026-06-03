import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredAuditRows(): Promise<void> {
    const telemetryDaysRaw =
      this.config.get<string>('AUDIT_RETENTION_TELEMETRY_DAYS');
    const telemetryDays =
      telemetryDaysRaw === undefined || telemetryDaysRaw === ''
        ? 90
        : Math.max(1, Math.floor(Number(telemetryDaysRaw)));
    const financialYearsRaw =
      this.config.get<string>('AUDIT_RETENTION_FINANCIAL_YEARS');
    const financialYears =
      financialYearsRaw === undefined || financialYearsRaw === ''
        ? 7
        : Math.max(1, Math.floor(Number(financialYearsRaw)));
    const engagementDaysRaw =
      this.config.get<string>('ENGAGEMENT_RETENTION_DAYS');
    const engagementDays =
      engagementDaysRaw === undefined || engagementDaysRaw === ''
        ? 90
        : Math.max(1, Math.floor(Number(engagementDaysRaw)));
    const cutoffTelemetry = new Date(
      Date.now() - telemetryDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const cutoffEngagement = new Date(
      Date.now() - engagementDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const cutoffFinancial = new Date(
      Date.now() - financialYears * 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const client = this.supabase.getClient();
    try {
      await client
        .from('client_event_batches')
        .delete()
        .lt('created_at', cutoffTelemetry);
      await client
        .from('api_request_logs')
        .delete()
        .lt('occurred_at', cutoffTelemetry);
      await client
        .from('auth_security_events')
        .delete()
        .lt('created_at', cutoffTelemetry);
      await client
        .from('storage_access_events')
        .delete()
        .lt('created_at', cutoffTelemetry);
      await client
        .from('credit_ledger')
        .delete()
        .lt('created_at', cutoffFinancial);
      await client
        .from('stripe_financial_events')
        .delete()
        .lt('created_at', cutoffFinancial);
      await client
        .from('stripe_webhook_events')
        .delete()
        .lt('received_at', cutoffTelemetry);
      await client
        .from('search_query_logs')
        .delete()
        .lt('created_at', cutoffTelemetry);
      await client
        .from('job_impressions')
        .delete()
        .lt('shown_at', cutoffEngagement);
    } catch (err) {
      this.logger.warn(`Retention purge failed: ${String(err)}`);
    }
  }
}
