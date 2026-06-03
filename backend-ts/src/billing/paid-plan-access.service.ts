import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/** Mirrors PWA SubscriptionStatusPanel `hasPaidPlanAccess`. */
export function hasPaidPlanAccessFromRow(
  planSlug: string,
  status: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: string | null,
): boolean {
  if (!planSlug || planSlug === 'zadarmo') {
    return false;
  }
  const normalizedStatus = (status ?? '').trim();
  const hasActivePaidStatus =
    Boolean(normalizedStatus) && normalizedStatus !== 'canceled';
  if (hasActivePaidStatus) {
    return true;
  }
  if (cancelAtPeriodEnd) {
    return true;
  }
  if (currentPeriodEnd) {
    return new Date(currentPeriodEnd).getTime() > Date.now();
  }
  return false;
}

type SubscriptionRow = {
  user_id: string;
  plan_id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

@Injectable()
export class PaidPlanAccessService {
  constructor(private readonly supabase: SupabaseService) {}

  async getPaidPlanOwnerIds(ownerIds: string[]): Promise<Set<string>> {
    const unique = [...new Set(ownerIds.filter((id) => Boolean(id)))];
    if (unique.length === 0) {
      return new Set();
    }
    const client = this.supabase.getClient();
    const { data: subsData, error } = await client
      .from('user_subscriptions')
      .select(
        'user_id, plan_id, status, cancel_at_period_end, current_period_end',
      )
      .in('user_id', unique);
    if (error || !Array.isArray(subsData) || subsData.length === 0) {
      return new Set();
    }
    const subs = subsData as SubscriptionRow[];
    const planIds = [...new Set(subs.map((s) => s.plan_id))];
    const { data: plansData } = await client
      .from('subscription_plans')
      .select('id, slug')
      .in('id', planIds);
    const slugByPlanId = new Map<string, string>();
    for (const plan of (plansData ?? []) as { id: string; slug: string }[]) {
      slugByPlanId.set(plan.id, plan.slug);
    }
    const paid = new Set<string>();
    for (const sub of subs) {
      const planSlug = slugByPlanId.get(sub.plan_id) ?? 'zadarmo';
      if (
        hasPaidPlanAccessFromRow(
          planSlug,
          sub.status,
          Boolean(sub.cancel_at_period_end),
          sub.current_period_end ?? null,
        )
      ) {
        paid.add(sub.user_id);
      }
    }
    return paid;
  }
}
