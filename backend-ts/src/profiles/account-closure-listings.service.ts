import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SearchIndexingService } from '../search/search-indexing.service';

/**
 * Deactivates public job and company-ad listings when an account is closed
 * (self-delete or admin). Keeps rows for audit/applications but hides catalog.
 */
@Injectable()
export class AccountClosureListingsService {
  private readonly logger = new Logger(AccountClosureListingsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly searchIndexing: SearchIndexingService,
  ) {}

  async deactivateForClosedAccount(
    userId: string,
    closedEmployerJobLabel: string,
  ): Promise<void> {
    const client = this.supabase.getClient();

    const { data: jobRows, error: jobErr } = await client
      .from('job_offers')
      .select('id')
      .eq('company_id', userId)
      .eq('is_deleted', false);
    if (!jobErr && Array.isArray(jobRows)) {
      for (const row of jobRows as { id: string }[]) {
        await this.searchIndexing.removeJobById(String(row.id));
      }
    } else if (jobErr) {
      this.logger.warn(
        `job_offers select before account closure: ${jobErr.message}`,
      );
    }

    const { error: deactivateErr } = await client
      .from('job_offers')
      .update({
        is_active: false,
        employer_name: closedEmployerJobLabel,
        employer_email: null,
      })
      .eq('company_id', userId)
      .eq('is_deleted', false);
    if (deactivateErr) {
      this.logger.warn(
        `job_offers deactivate on account closure: ${deactivateErr.message}`,
      );
    }

    const now = new Date().toISOString();
    const { error: adsErr } = await client
      .from('company_ads')
      .update({ status: 'archived', updated_at: now })
      .eq('owner_id', userId)
      .eq('status', 'active');
    if (adsErr) {
      this.logger.warn(
        `company_ads archive on account closure: ${adsErr.message}`,
      );
    }
  }
}
