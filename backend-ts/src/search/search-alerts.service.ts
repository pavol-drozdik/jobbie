import { Injectable, Logger } from '@nestjs/common';
import { APP_PATHS } from '../common/app-paths';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { TypesenseService } from './typesense.service';
import { EmailService } from '../email/email.service';
import type { TypesenseJobSortMode } from './typesense-job-search.types';

type SavedSearchRow = {
  id: string;
  user_id: string;
  name: string | null;
  query_json: Record<string, unknown>;
  last_notified_at: string | null;
};

function parseNumber(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') {
    return undefined;
  }
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : undefined;
}

function skillTagsFromJson(qj: Record<string, unknown>): string[] {
  const raw = qj.skills;
  if (typeof raw !== 'string' || !raw.trim()) {
    return [];
  }
  return [
    ...new Set(
      raw
        .split(/[,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0),
    ),
  ].slice(0, 24);
}

@Injectable()
export class SearchAlertsService {
  private readonly logger = new Logger(SearchAlertsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly typesense: TypesenseService,
    private readonly email: EmailService,
  ) {}

  /** Typesense + SMTP gates for scheduled / queued alert runs. */
  canRunAlerts(): boolean {
    if (!this.typesense.isEnabled()) {
      return false;
    }
    if (!this.email.isConfigured()) {
      return false;
    }
    return true;
  }

  async dispatchSavedSearchAlerts(): Promise<void> {
    if (!this.canRunAlerts()) {
      return;
    }
    const { data: rows, error } = await this.supabase
      .getClient()
      .from('saved_searches')
      .select('id,user_id,name,query_json,last_notified_at')
      .eq('notify_email', true);
    if (error || !rows?.length) {
      return;
    }
    const baseUrl =
      this.config.get<string>('PUBLIC_APP_URL')?.replace(/\/$/, '') ??
      'https://jobbie.app';
    for (const row of rows as SavedSearchRow[]) {
      try {
        await this.processOneAlert(row, baseUrl);
      } catch (err) {
        this.logger.warn(
          `Alert ${row.id} failed: ${String(err)}`,
        );
      }
    }
  }

  private async processOneAlert(
    row: SavedSearchRow,
    baseUrl: string,
  ): Promise<void> {
    const qj = row.query_json ?? {};
    const lastSec = row.last_notified_at
      ? Math.floor(new Date(row.last_notified_at).getTime() / 1000)
      : 0;
    const createdAfterTs =
      lastSec > 0
        ? lastSec
        : Math.floor((Date.now() - 86400000) / 1000);
    const sort = (typeof qj.sort === 'string'
      ? qj.sort
      : 'created_at') as TypesenseJobSortMode;
    const ts = await this.typesense.searchJobsTypesense({
      q: typeof qj.q === 'string' ? qj.q : undefined,
      location: typeof qj.location === 'string' ? qj.location : undefined,
      category:
        typeof qj.category === 'string' && qj.category !== 'all'
          ? qj.category
          : undefined,
      jobType:
        typeof qj.job_type === 'string' && qj.job_type !== 'all'
          ? String(qj.job_type)
          : undefined,
      urgentOnly: qj.urgent_only === true || qj.urgent_only === 'true',
      minHourlyWage: parseNumber(qj.min_hourly_wage),
      maxHourlyWage: parseNumber(qj.max_hourly_wage),
      createdAfterTs,
      skillTagsAny: skillTagsFromJson(qj),
      limit: 15,
      offset: 0,
      sort: sort === 'relevance' || sort === 'compensation_amount' ? sort : 'created_at',
      includeFacets: false,
    });
    if (!ts || ts.ids.length === 0) {
      return;
    }
    const { data: authData, error: authErr } =
      await this.supabase.getClient().auth.admin.getUserById(row.user_id);
    if (authErr || !authData?.user?.email) {
      return;
    }
    const title = row.name?.trim() || 'Uložené hľadanie';
    const listUrl = `${baseUrl}${APP_PATHS.find}`;
    const jobLines = ts.ids
      .slice(0, 10)
      .map((id) => `<li><a href="${baseUrl}/app/jobs/${id}">${id}</a></li>`)
      .join('');
    const ok = await this.email.sendHtmlEmail({
      to: authData.user.email,
      subject: `Jobbie: nové brigády (${ts.ids.length}) — ${title}`,
      html: `<p>Nové ponuky zodpovedajúce vášmu uloženému hľadaniu.</p><ul>${jobLines}</ul><p><a href="${listUrl}">Otvoriť Jobbie</a></p>`,
    });
    if (ok) {
      await this.supabase
        .getClient()
        .from('saved_searches')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }
}
