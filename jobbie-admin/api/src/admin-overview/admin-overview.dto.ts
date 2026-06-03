import type { AuditEventRowDto } from '../audit/admin-audit.dto';

export type AdminOverviewKpisDto = {
  readonly signups_today: number;
  readonly signups_7d: number;
  readonly jobs_published_today: number;
  readonly jobs_published_7d: number;
};

export type AdminOverviewDto = {
  readonly open_reports_count: number;
  readonly kpis: AdminOverviewKpisDto;
  readonly failed_payments_count: number;
  readonly recent_audit_events: AuditEventRowDto[];
};
