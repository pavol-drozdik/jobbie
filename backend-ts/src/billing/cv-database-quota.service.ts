import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE } from './billing-errors';
import {
  resolvePlanSlug,
  subscriptionPlanSpecBySlug,
} from './billing.config';
import { hasPaidPlanAccessFromRow } from './paid-plan-access.service';

export type CvQuotaAction = 'unlock' | 'contact' | 'pdf';

const ACTION_USAGE_COLUMN: Record<
  CvQuotaAction,
  'unlocks_count' | 'contacts_count' | 'pdf_downloads_count'
> = {
  unlock: 'unlocks_count',
  contact: 'contacts_count',
  pdf: 'pdf_downloads_count',
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

type PlanCvRow = {
  slug?: string;
  max_cv_unlocks_monthly: number | null;
  max_cv_contacts_monthly: number | null;
  max_cv_pdf_downloads_monthly: number | null;
};

const PLAN_CV_SELECT =
  'slug, max_cv_unlocks_monthly, max_cv_contacts_monthly, max_cv_pdf_downloads_monthly';

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
    const { slug, row } = await this.loadEffectivePlan(companyUserId);
    return this.cvLimitsFromPlanRow(row, slug);
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

    const { slug, row } = await this.loadEffectivePlan(companyUserId);
    const limits = this.cvLimitsFromPlanRow(row, slug);
    const limit = limits.maxCvPdfDownloadsMonthly;

    if (limit !== null) {
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
   * Consumes one included monthly quota when the plan has a cap; tracks usage even when unlimited.
   * When the cap is reached, rejects — does not spend credits.
   */
  async consumeIncludedQuota(
    companyUserId: string,
    action: CvQuotaAction,
  ): Promise<void> {
    const { slug, row } = await this.loadEffectivePlan(companyUserId);
    const limits = this.cvLimitsFromPlanRow(row, slug);
    const limit = this.limitForAction(limits, action);
    const periodMonth = this.currentPeriodMonth();
    const usageCol = ACTION_USAGE_COLUMN[action];
    const client = this.supabase.getClient();

    if (limit !== null) {
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
    }

    await this.incrementUsage(companyUserId, periodMonth, action);
  }

  private limitForAction(
    limits: CvQuotaLimits,
    action: CvQuotaAction,
  ): number | null {
    switch (action) {
      case 'unlock':
        return limits.maxCvUnlocksMonthly;
      case 'contact':
        return limits.maxCvContactsMonthly;
      case 'pdf':
        return limits.maxCvPdfDownloadsMonthly;
      default:
        return null;
    }
  }

  private cvLimitsFromPlanRow(
    row: PlanCvRow | null,
    slug: string,
  ): CvQuotaLimits {
    const resolvedSlug = resolvePlanSlug(slug);
    if (resolvedSlug === 'agentura') {
      return {
        maxCvUnlocksMonthly: null,
        maxCvContactsMonthly: null,
        maxCvPdfDownloadsMonthly: null,
      };
    }
    const spec = subscriptionPlanSpecBySlug(resolvedSlug);
    return {
      maxCvUnlocksMonthly:
        row?.max_cv_unlocks_monthly ?? spec?.maxCvUnlocksMonthly ?? null,
      maxCvContactsMonthly:
        row?.max_cv_contacts_monthly ?? spec?.maxCvContactsMonthly ?? null,
      maxCvPdfDownloadsMonthly:
        row?.max_cv_pdf_downloads_monthly ?? spec?.maxCvPdfDownloadsMonthly ?? null,
    };
  }

  private async loadZadarmoPlanRow(): Promise<PlanCvRow | null> {
    const client = this.supabase.getClient();
    const { data: freePlan } = await client
      .from('subscription_plans')
      .select(PLAN_CV_SELECT)
      .eq('slug', 'zadarmo')
      .single();
    return (freePlan as PlanCvRow | null) ?? null;
  }

  private async loadEffectivePlan(
    companyUserId: string,
  ): Promise<{ slug: string; row: PlanCvRow | null }> {
    const client = this.supabase.getClient();
    const { data: sub } = await client
      .from('user_subscriptions')
      .select('plan_id, status, cancel_at_period_end, current_period_end')
      .eq('user_id', companyUserId)
      .maybeSingle();

    const subRow = sub as {
      plan_id?: string;
      status?: string;
      cancel_at_period_end?: boolean;
      current_period_end?: string | null;
    } | null;

    if (subRow?.plan_id) {
      const { data: plan } = await client
        .from('subscription_plans')
        .select(PLAN_CV_SELECT)
        .eq('id', subRow.plan_id)
        .maybeSingle();

      const slug = resolvePlanSlug(
        (plan as { slug?: string } | null)?.slug ?? 'zadarmo',
      );
      const hasPaidAccess = hasPaidPlanAccessFromRow(
        slug,
        subRow.status ?? '',
        Boolean(subRow.cancel_at_period_end),
        subRow.current_period_end ?? null,
      );

      if (hasPaidAccess && plan) {
        return { slug, row: plan as PlanCvRow };
      }
    }

    const row = await this.loadZadarmoPlanRow();
    return { slug: 'zadarmo', row };
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
}
