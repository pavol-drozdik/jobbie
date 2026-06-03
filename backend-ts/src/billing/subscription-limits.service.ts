import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  APPLICANT_AUTO_REPLIES_PLUS_PRO_MESSAGE,
  hasPlusOrProAccessFromRow,
} from './plan-tier-access';
import { resolvePlanSlug } from './billing.config';

export type SubscriptionAccessSnapshot = {
  planSlug: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

/** Enforces max_active_jobs across active job_offers + company_ads before publish. */
@Injectable()
export class SubscriptionLimitsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSubscriptionAccess(userId: string): Promise<SubscriptionAccessSnapshot> {
    const client = this.supabase.getClient();
    const { data: sub } = await client
      .from('user_subscriptions')
      .select('plan_id, status, cancel_at_period_end, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    const subRow = sub as {
      plan_id?: string;
      status?: string;
      cancel_at_period_end?: boolean;
      current_period_end?: string | null;
    } | null;
    let planSlug = 'zadarmo';
    if (subRow?.plan_id) {
      const { data: plan } = await client
        .from('subscription_plans')
        .select('slug')
        .eq('id', subRow.plan_id)
        .maybeSingle();
      planSlug = resolvePlanSlug((plan as { slug?: string } | null)?.slug ?? 'zadarmo');
    }
    return {
      planSlug,
      status: (subRow?.status ?? '').trim(),
      cancelAtPeriodEnd: Boolean(subRow?.cancel_at_period_end),
      currentPeriodEnd: subRow?.current_period_end ?? null,
    };
  }

  async hasPlusOrProAccess(userId: string): Promise<boolean> {
    const access = await this.getSubscriptionAccess(userId);
    return hasPlusOrProAccessFromRow(
      access.planSlug,
      access.status,
      access.cancelAtPeriodEnd,
      access.currentPeriodEnd,
    );
  }

  async assertPlusOrProAccess(
    userId: string,
    message = APPLICANT_AUTO_REPLIES_PLUS_PRO_MESSAGE,
  ): Promise<void> {
    const allowed = await this.hasPlusOrProAccess(userId);
    if (!allowed) {
      throw new ForbiddenException(message);
    }
  }

  async getPlanLimits(userId: string): Promise<{
    maxActiveOffers: number;
    planSlug: string;
    planNameSk: string;
    monthlyCredits: number;
  }> {
    const client = this.supabase.getClient();
    const { data: sub } = await client
      .from('user_subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .maybeSingle();

    let planId = (sub as { plan_id?: string } | null)?.plan_id;
    if (!planId) {
      const { data: freePlan } = await client
        .from('subscription_plans')
        .select('id, slug, name_sk, max_active_jobs, monthly_credits')
        .eq('slug', 'zadarmo')
        .single();
      const fp = freePlan as {
        id: string;
        slug: string;
        name_sk: string;
        max_active_jobs: number;
        monthly_credits: number;
      };
      return {
        maxActiveOffers: fp?.max_active_jobs ?? 1,
        planSlug: fp?.slug ?? 'zadarmo',
        planNameSk: fp?.name_sk ?? 'Zadarmo',
        monthlyCredits: fp?.monthly_credits ?? 5,
      };
    }

    const { data: plan } = await client
      .from('subscription_plans')
      .select('slug, name_sk, max_active_jobs, monthly_credits')
      .eq('id', planId)
      .single();

    const p = plan as {
      slug: string;
      name_sk: string;
      max_active_jobs: number;
      monthly_credits: number;
    } | null;

    return {
      maxActiveOffers: p?.max_active_jobs ?? 1,
      planSlug: p?.slug ?? 'zadarmo',
      planNameSk: p?.name_sk ?? 'Zadarmo',
      monthlyCredits: p?.monthly_credits ?? 5,
    };
  }

  async countActiveOffers(userId: string): Promise<number> {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();

    const { count: jobCount } = await client
      .from('job_offers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userId)
      .eq('is_active', true)
      .eq('is_draft', false)
      .eq('is_deleted', false);

    const { count: adCount } = await client
      .from('company_ads')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'active')
      .gt('ends_at', now);

    return (jobCount ?? 0) + (adCount ?? 0);
  }

  async assertCanPublish(
    userId: string,
    options?: { excludeJobId?: string; excludeAdId?: string },
  ): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    let count = await this.countActiveOffers(userId);

    if (options?.excludeJobId) {
      const client = this.supabase.getClient();
      const { data: job } = await client
        .from('job_offers')
        .select('is_active, is_draft')
        .eq('id', options.excludeJobId)
        .eq('company_id', userId)
        .maybeSingle();
      if (
        job &&
        (job as { is_active: boolean; is_draft: boolean }).is_active &&
        !(job as { is_draft: boolean }).is_draft
      ) {
        count -= 1;
      }
    }

    if (options?.excludeAdId) {
      const client = this.supabase.getClient();
      const now = new Date().toISOString();
      const { data: ad } = await client
        .from('company_ads')
        .select('status, ends_at')
        .eq('id', options.excludeAdId)
        .eq('owner_id', userId)
        .maybeSingle();
      if (
        ad &&
        (ad as { status: string }).status === 'active' &&
        (ad as { ends_at: string }).ends_at > now
      ) {
        count -= 1;
      }
    }

    if (count >= limits.maxActiveOffers) {
      throw new ForbiddenException(
        'Dosiahli ste limit aktívnych ponúk pre váš plán. Vyberte si vyšší plán alebo pozastavte niektorú ponuku.',
      );
    }
  }
}
