import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { SearchIndexingService } from '../search/search-indexing.service';
import { isApplicationDeadlinePassed } from './job-deadline.util';

/**
 * Deactivates published job listings after `application_deadline` or `expires_at`
 * and drops them from Typesense. NOTE: Does not refund credits — listings simply go inactive.
 */
@Injectable()
export class JobListingExpiryCron {
  private readonly logger = new Logger(JobListingExpiryCron.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly searchIndexing: SearchIndexingService,
  ) {}

  @Cron('5 * * * *')
  async closeExpiredListings(): Promise<void> {
    const nowIso = new Date().toISOString();
    const client = this.supabase.getClient();
    const idSet = new Set<string>();

    const { data: byDeadline, error: dErr } = await client
      .from('job_offers')
      .select('id')
      .eq('is_deleted', false)
      .eq('is_draft', false)
      .not('application_deadline', 'is', null)
      .lt('application_deadline', nowIso)
      .eq('is_active', true);
    if (dErr) {
      this.logger.warn(`closeExpiredListings deadline: ${dErr.message}`);
    } else {
      for (const r of (byDeadline ?? []) as { id: string }[]) {
        if (r.id) idSet.add(r.id);
      }
    }

    const { data: byExpires, error: eErr } = await client
      .from('job_offers')
      .select('id')
      .eq('is_deleted', false)
      .eq('is_draft', false)
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso)
      .eq('is_active', true);
    if (eErr) {
      this.logger.warn(`closeExpiredListings expires_at: ${eErr.message}`);
    } else {
      for (const r of (byExpires ?? []) as { id: string }[]) {
        if (r.id) idSet.add(r.id);
      }
    }

    const ids = [...idSet];
    if (ids.length === 0) {
      return;
    }
    const { error: upErr } = await client
      .from('job_offers')
      .update({ is_active: false })
      .in('id', ids);
    if (upErr) {
      this.logger.warn(`closeExpiredListings update: ${upErr.message}`);
      return;
    }
    for (const id of ids) {
      try {
        await this.searchIndexing.removeJobById(id);
      } catch (err) {
        this.logger.warn(`removeJobById ${id}: ${String(err)}`);
      }
    }
    this.logger.log(`Closed ${ids.length} expired job listing(s).`);
  }
}
