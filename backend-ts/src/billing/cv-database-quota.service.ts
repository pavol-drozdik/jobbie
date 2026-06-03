import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE } from './billing-errors';

export type CvQuotaAction = 'unlock' | 'contact' | 'pdf';

const ACTION_USAGE_COLUMN: Record<
  CvQuotaAction,
  'unlocks_count' | 'contacts_count' | 'pdf_downloads_count'
> = {
  unlock: 'unlocks_count',
  contact: 'contacts_count',
  pdf: 'pdf_downloads_count',
};

const ACTION_LIMIT_COLUMN: Record<
  CvQuotaAction,
  | 'max_cv_unlocks_monthly'
  | 'max_cv_contacts_monthly'
  | 'max_cv_pdf_downloads_monthly'
> = {
  unlock: 'max_cv_unlocks_monthly',
  contact: 'max_cv_contacts_monthly',
  pdf: 'max_cv_pdf_downloads_monthly',
};

export type CvQuotaLimits = {
  maxCvUnlocksMonthly: number | null;
  maxCvContactsMonthly: number | null;
  maxCvPdfDownloadsMonthly: number | null;
};

export type CvQuotaUsage = {
  unlocksCount: number;
  contactsCount: number;
  pdfDownloadsCount: number;
  periodMonth: string;
};

@Injectable()
export class CvDatabaseQuotaService {
  constructor(private readonly supabase: SupabaseService) {}

  currentPeriodMonth(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  async getLimits(companyUserId: string): Promise<CvQuotaLimits> {
    const plan = await this.loadPlanRow(companyUserId);
    return {
      maxCvUnlocksMonthly: plan?.max_cv_unlocks_monthly ?? null,
      maxCvContactsMonthly: plan?.max_cv_contacts_monthly ?? null,
      maxCvPdfDownloadsMonthly: plan?.max_cv_pdf_downloads_monthly ?? null,
    };
  }

  async getUsage(companyUserId: string): Promise<CvQuotaUsage> {
    const periodMonth = this.currentPeriodMonth();
    const client = this.supabase.getClient();
    const { data } = await client
      .from('employer_cv_monthly_usage')
      .select('unlocks_count, contacts_count, pdf_downloads_count')
      .eq('company_id', companyUserId)
      .eq('period_month', periodMonth)
      .maybeSingle();

    const row = data as {
      unlocks_count?: number;
      contacts_count?: number;
      pdf_downloads_count?: number;
    } | null;

    return {
      unlocksCount: row?.unlocks_count ?? 0,
      contactsCount: row?.contacts_count ?? 0,
      pdfDownloadsCount: row?.pdf_downloads_count ?? 0,
      periodMonth,
    };
  }

  /**
   * CV database detail view or PDF download — one quota unit per distinct CV per month.
   * Re-opening the same CV or downloading after viewing does not consume again.
   */
  async consumeIncludedPdfAccess(
    companyUserId: string,
    cvId: string,
  ): Promise<void> {
    const plan = await this.loadPlanRow(companyUserId);
    const limit =
      (plan?.max_cv_pdf_downloads_monthly as number | null | undefined) ?? null;
    if (limit === null) {
      return;
    }
    const periodMonth = this.currentPeriodMonth();
    const client = this.supabase.getClient();
    const { data: existingAccess } = await client
      .from('employer_cv_monthly_pdf_access')
      .select('cv_id')
      .eq('company_id', companyUserId)
      .eq('cv_id', cvId)
      .eq('period_month', periodMonth)
      .maybeSingle();
    if (existingAccess) {
      return;
    }
    const usageCol = ACTION_USAGE_COLUMN.pdf;
    const { data: usageRow } = await client
      .from('employer_cv_monthly_usage')
      .select(usageCol)
      .eq('company_id', companyUserId)
      .eq('period_month', periodMonth)
      .maybeSingle();
    const current = (usageRow as Record<string, number> | null)?.[usageCol] ?? 0;
    if (current >= limit) {
      throw new ForbiddenException(CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE);
    }
    const { error: insertAccessErr } = await client
      .from('employer_cv_monthly_pdf_access')
      .insert({
        company_id: companyUserId,
        cv_id: cvId,
        period_month: periodMonth,
      });
    if (insertAccessErr) {
      if (insertAccessErr.code === '23505') {
        return;
      }
      throw new ForbiddenException('Nepodarilo sa zapísať prístup k životopisu.');
    }
    await this.incrementUsage(companyUserId, periodMonth, 'pdf');
  }

  /**
   * Consumes one included monthly quota when the plan has a cap; unlimited when limit is null.
   * When the cap is reached, rejects — does not spend credits.
   */
  async consumeIncludedQuota(
    companyUserId: string,
    action: CvQuotaAction,
  ): Promise<void> {
    const plan = await this.loadPlanRow(companyUserId);
    const limitCol = ACTION_LIMIT_COLUMN[action];
    const limit = plan ? (plan[limitCol] as number | null | undefined) ?? null : null;

    if (limit === null) {
      return;
    }

    const periodMonth = this.currentPeriodMonth();
    const usageCol = ACTION_USAGE_COLUMN[action];
    const client = this.supabase.getClient();

    const { data: usageRow } = await client
      .from('employer_cv_monthly_usage')
      .select(usageCol)
      .eq('company_id', companyUserId)
      .eq('period_month', periodMonth)
      .maybeSingle();

    const current = (usageRow as Record<string, number> | null)?.[usageCol] ?? 0;

    if (current >= limit) {
      throw new ForbiddenException(CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE);
    }

    await this.incrementUsage(companyUserId, periodMonth, action);
  }

  private async incrementUsage(
    companyUserId: string,
    periodMonth: string,
    action: CvQuotaAction,
  ): Promise<void> {
    const col = ACTION_USAGE_COLUMN[action];
    const client = this.supabase.getClient();
    const { data: existing } = await client
      .from('employer_cv_monthly_usage')
      .select('unlocks_count, contacts_count, pdf_downloads_count')
      .eq('company_id', companyUserId)
      .eq('period_month', periodMonth)
      .maybeSingle();

    if (!existing) {
      const insert: Record<string, unknown> = {
        company_id: companyUserId,
        period_month: periodMonth,
        unlocks_count: 0,
        contacts_count: 0,
        pdf_downloads_count: 0,
      };
      insert[col] = 1;
      await client.from('employer_cv_monthly_usage').insert(insert);
      return;
    }

    const row = existing as Record<string, number>;
    const next = (row[col] ?? 0) + 1;
    await client
      .from('employer_cv_monthly_usage')
      .update({ [col]: next })
      .eq('company_id', companyUserId)
      .eq('period_month', periodMonth);
  }

  private async loadPlanRow(companyUserId: string): Promise<{
    max_cv_unlocks_monthly: number | null;
    max_cv_contacts_monthly: number | null;
    max_cv_pdf_downloads_monthly: number | null;
  } | null> {
    const client = this.supabase.getClient();
    const { data: sub } = await client
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_id', companyUserId)
      .maybeSingle();

    let planId = (sub as { plan_id?: string } | null)?.plan_id;
    if (!planId) {
      const { data: freePlan } = await client
        .from('subscription_plans')
        .select(
          'max_cv_unlocks_monthly, max_cv_contacts_monthly, max_cv_pdf_downloads_monthly',
        )
        .eq('slug', 'zadarmo')
        .single();
      return freePlan as {
        max_cv_unlocks_monthly: number | null;
        max_cv_contacts_monthly: number | null;
        max_cv_pdf_downloads_monthly: number | null;
      } | null;
    }

    const { data: plan } = await client
      .from('subscription_plans')
      .select(
        'max_cv_unlocks_monthly, max_cv_contacts_monthly, max_cv_pdf_downloads_monthly, slug',
      )
      .eq('id', planId)
      .single();

    const p = plan as {
      slug?: string;
      max_cv_unlocks_monthly: number | null;
      max_cv_contacts_monthly: number | null;
      max_cv_pdf_downloads_monthly: number | null;
    } | null;

    if (!p) return null;

    // Legacy agentura tier: treat as unlimited included (no monthly cap).
    if (p.slug === 'agentura') {
      return {
        max_cv_unlocks_monthly: null,
        max_cv_contacts_monthly: null,
        max_cv_pdf_downloads_monthly: null,
      };
    }

    return p;
  }
}
