import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  buildAuditEventsQuery,
  fetchActorLabels,
} from '../audit/admin-audit-query.util';
import { rowToAuditEventDto } from '../audit/admin-audit.dto';
import type { AdminOverviewDto } from './admin-overview.dto';

function startOfUtcDay(d: Date): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ).toISOString();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

@Injectable()
export class AdminOverviewService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOverview(actorUserId?: string): Promise<AdminOverviewDto> {
    const client = this.supabase.getClient();
    const todayStart = startOfUtcDay(new Date());
    const sevenDaysAgo = daysAgoIso(7);

    const [
      openReportsRes,
      signupsTodayRes,
      signups7dRes,
      jobsTodayRes,
      jobs7dRes,
      failedPaymentsRes,
      auditRes,
    ] = await Promise.all([
      client
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo),
      client
        .from('job_offers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_draft', false)
        .gte('created_at', todayStart),
      client
        .from('job_offers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_draft', false)
        .gte('created_at', sevenDaysAgo),
      client
        .from('stripe_webhook_events')
        .select('stripe_event_id', { count: 'exact', head: true })
        .eq('processing_status', 'failed')
        .gte('received_at', sevenDaysAgo),
      buildAuditEventsQuery(client, {
        limit: 5,
        ascending: false,
        userId: actorUserId,
      }),
    ]);

    const auditRows = ((await auditRes).data ?? []) as Record<string, unknown>[];
    const actorIds = auditRows
      .map((r) => (r.actor_user_id ? String(r.actor_user_id) : ''))
      .filter(Boolean);
    const actorLabels = await fetchActorLabels(client, actorIds);

    return {
      open_reports_count: openReportsRes.count ?? 0,
      kpis: {
        signups_today: signupsTodayRes.count ?? 0,
        signups_7d: signups7dRes.count ?? 0,
        jobs_published_today: jobsTodayRes.count ?? 0,
        jobs_published_7d: jobs7dRes.count ?? 0,
      },
      failed_payments_count: failedPaymentsRes.count ?? 0,
      recent_audit_events: auditRows.map((r) =>
        rowToAuditEventDto(r, actorLabels),
      ),
    };
  }

  async countOpenReports(): Promise<number> {
    const { count } = await this.supabase
      .getClient()
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    return count ?? 0;
  }
}
