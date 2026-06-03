import { Injectable } from '@nestjs/common';
import { isApplicationDeadlinePassed } from '../jobs/job-deadline.util';
import { SupabaseService } from '../supabase/supabase.service';
import { TypesenseService } from '../search/typesense.service';
import {
  buildTypesenseParamsFromCriteria,
  type JobAlertSearchCriteria,
} from './job-alerts-matching.util';

/** Max jobs considered for wizard preview count (aligned with public catalog quality). */
export const JOB_ALERT_PUBLIC_MATCH_CAP = 100;

/** Max Typesense hits fetched per email dispatch run. */
export const JOB_ALERT_DISPATCH_MATCH_LIMIT = 50;

@Injectable()
export class JobAlertsMatchingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly typesense: TypesenseService,
  ) {}

  /**
   * Count of public catalog jobs matching alert criteria (same pipeline as `/api/search` relevance).
   */
  async countPublicJobsMatching(criteria: JobAlertSearchCriteria): Promise<number> {
    const ids = await this.matchPublicJobIds(criteria, {
      limit: JOB_ALERT_PUBLIC_MATCH_CAP,
    });
    return ids.length;
  }

  /**
   * Job IDs matching criteria after Typesense relevance refinement and Postgres catalog checks.
   */
  async matchPublicJobIds(
    criteria: JobAlertSearchCriteria,
    options?: {
      createdAfterTs?: number;
      createdBeforeTs?: number;
      limit?: number;
      sort?: 'relevance' | 'created_at';
    },
  ): Promise<string[]> {
    if (!this.typesense.isEnabled()) {
      return [];
    }
    const limit = Math.min(
      Math.max(options?.limit ?? JOB_ALERT_PUBLIC_MATCH_CAP, 1),
      JOB_ALERT_PUBLIC_MATCH_CAP,
    );
    const params = buildTypesenseParamsFromCriteria({
      ...criteria,
      employment_types: criteria.employment_types ?? [],
    });
    const ts = await this.typesense.searchJobsTypesense({
      ...params,
      createdAfterTs: options?.createdAfterTs,
      createdBeforeTs: options?.createdBeforeTs,
      limit,
      offset: 0,
      sort: options?.sort ?? 'relevance',
      includeFacets: false,
    });
    if (!ts?.ids.length) {
      return [];
    }
    return this.filterToPublicCatalogJobIds(ts.ids);
  }

  /**
   * Digest dispatch: chronological window fill, capped at {@link JOB_ALERT_DISPATCH_MATCH_LIMIT}.
   */
  async matchPublicJobIdsForDispatch(
    criteria: JobAlertSearchCriteria,
    options: { createdAfterTs: number; createdBeforeTs: number },
  ): Promise<string[]> {
    return this.matchPublicJobIds(criteria, {
      createdAfterTs: options.createdAfterTs,
      createdBeforeTs: options.createdBeforeTs,
      limit: JOB_ALERT_DISPATCH_MATCH_LIMIT,
      sort: 'created_at',
    });
  }

  /** Keeps Typesense order; drops inactive, draft, deleted, or expired listings. */
  private async filterToPublicCatalogJobIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id, application_deadline')
      .in('id', ids)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .eq('is_draft', false);
    if (error || !data?.length) {
      return [];
    }
    const allowed = new Set<string>();
    for (const row of data as Array<{
      id: string;
      application_deadline?: string | null;
    }>) {
      if (
        row.id &&
        !isApplicationDeadlinePassed(row.application_deadline ?? null)
      ) {
        allowed.add(String(row.id));
      }
    }
    return ids.filter((id) => allowed.has(id));
  }
}
