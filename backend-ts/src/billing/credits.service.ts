import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  decodeKeysetCursor,
  encodeKeysetCursor,
} from '../common/keyset-cursor';
import {
  CREDIT_COSTS,
  CreditCostKey,
  getCreditCost,
  PAID_SUBSCRIPTION_CREDIT_ROLLOVER_DAYS,
} from './billing.config';
import { INSUFFICIENT_CREDITS_MESSAGE } from './billing-errors';
import {
  getPlanTierCreditCost,
  type PlanTierCreditAction,
} from './plan-tier-credit-costs';
import { SubscriptionLimitsService } from './subscription-limits.service';

export { INSUFFICIENT_CREDITS_MESSAGE };

export type SpendMeta = {
  reason: string;
  refType?: string | null;
  refId?: string | null;
  eventType?: string;
  subjectType?: string | null;
  subjectId?: string | null;
};

export type GrantMeta = {
  reason: string;
  source: 'purchase' | 'subscription_grant' | 'free_grant' | 'adjustment';
  expiresAt?: string | null;
  grantPeriod?: string | null;
  stripeInvoiceId?: string | null;
  paymentIntentId?: string | null;
  refType?: string | null;
  refId?: string | null;
};

/**
 * Sole Nest entry for balance changes — always via RPCs grant_credits / spend_credits /
 * reverse_spend_for_ref / expire_due_credit_lots. Never update profiles.credits directly.
 * spend_credits is idempotent per (ref_type, ref_id); credit_ledger is reconciliation source of truth.
 */
@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly limits: SubscriptionLimitsService,
  ) {}

  getCost(key: CreditCostKey): number {
    return getCreditCost(key);
  }

  async getBalance(userId: string): Promise<{
    credits: number;
    expiringSoon: number;
  }> {
    const client = this.supabase.getClient();
    const { data: prof } = await client
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    const credits = (prof as { credits?: number } | null)?.credits ?? 0;

    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    const { data: lots } = await client
      .from('credit_lots')
      .select('amount_remaining, expires_at')
      .eq('user_id', userId)
      .gt('amount_remaining', 0);
    let expiringSoon = 0;
    for (const lot of lots ?? []) {
      const row = lot as { amount_remaining: number; expires_at: string | null };
      if (row.expires_at && new Date(row.expires_at) <= soon) {
        expiringSoon += row.amount_remaining;
      }
    }
    return { credits, expiringSoon };
  }

  async spendByKey(
    userId: string,
    costKey: CreditCostKey,
    meta: SpendMeta,
  ): Promise<{ balanceAfter: number }> {
    return this.spendAmount(userId, getCreditCost(costKey), meta);
  }

  /** Skips RPC when amount is 0 (e.g. Plus/Pro urgent publish, Pro top listing). */
  async spendIfPositive(
    userId: string,
    amount: number,
    meta: SpendMeta,
  ): Promise<{ balanceAfter: number }> {
    if (amount < 1) {
      const balance = await this.getBalance(userId);
      return { balanceAfter: balance.credits };
    }
    return this.spendAmount(userId, amount, meta);
  }

  async spendForPlanTier(
    userId: string,
    action: PlanTierCreditAction,
    meta: SpendMeta,
  ): Promise<{ balanceAfter: number }> {
    const { planSlug } = await this.limits.getPlanLimits(userId);
    const amount = getPlanTierCreditCost(planSlug, action);
    return this.spendIfPositive(userId, amount, meta);
  }

  async spendAmount(
    userId: string,
    amount: number,
    meta: SpendMeta,
  ): Promise<{ balanceAfter: number }> {
    if (amount < 1) {
      throw new ForbiddenException('Neplatná suma kreditov.');
    }
    const auditId = await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: meta.eventType ?? 'credits.spend',
      subjectType: meta.subjectType ?? meta.refType ?? null,
      subjectId: meta.subjectId ?? (meta.refId ? null : null),
      payload: { reason: meta.reason, amount },
    });

    // Idempotency: duplicate ref_type+ref_id returns existing spend without double-charging.
    const { data, error } = await this.supabase.getClient().rpc('spend_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: meta.reason,
      p_ref_type: meta.refType ?? null,
      p_ref_id: meta.refId ?? null,
      p_audit_event_id: auditId,
    });

    if (error) {
      if (error.message?.includes('INSUFFICIENT_CREDITS') || error.code === 'P0002') {
        throw new ForbiddenException(INSUFFICIENT_CREDITS_MESSAGE);
      }
      this.logger.warn(`spend_credits failed: ${error.message}`);
      throw new ServiceUnavailableException(error.message);
    }

    const balanceAfter = (data as { balance_after?: number })?.balance_after ?? 0;
    return { balanceAfter };
  }

  async grant(
    userId: string,
    amount: number,
    meta: GrantMeta,
  ): Promise<{ balanceAfter: number }> {
    if (amount < 1) {
      return { balanceAfter: (await this.getBalance(userId)).credits };
    }

    const auditId = await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'credits.grant',
      subjectType: meta.refType ?? null,
      subjectId: null,
      payload: {
        reason: meta.reason,
        amount,
        source: meta.source,
      },
    });

    const { data, error } = await this.supabase.getClient().rpc('grant_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_source: meta.source,
      p_reason: meta.reason,
      p_expires_at: meta.expiresAt ?? null,
      p_grant_period: meta.grantPeriod ?? null,
      p_stripe_invoice_id: meta.stripeInvoiceId ?? null,
      p_payment_intent_id: meta.paymentIntentId ?? null,
      p_audit_event_id: auditId,
      p_ref_type: meta.refType ?? null,
      p_ref_id: meta.refId ?? null,
    });

    if (error) {
      this.logger.warn(`grant_credits failed: ${error.message}`);
      throw new ServiceUnavailableException(error.message);
    }

    return {
      balanceAfter: (data as { balance_after?: number })?.balance_after ?? 0,
    };
  }

  /** Paid subscription grant: expires in 60 days. */
  paidGrantExpiresAt(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + PAID_SUBSCRIPTION_CREDIT_ROLLOVER_DAYS);
    return d.toISOString();
  }

  /** Free plan grant: end of current UTC calendar month. */
  freeGrantExpiresAt(): string {
    const now = new Date();
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );
    return end.toISOString();
  }

  async listLedger(params: {
    userId: string;
    filter?: 'all' | 'purchases' | 'spending' | 'grants' | 'adjustments';
    limit?: number;
    cursor?: string;
  }): Promise<{
    entries: Array<{
      id: string;
      created_at: string;
      delta: number;
      balance_after: number;
      reason: string;
      ref_type: string | null;
      ref_id: string | null;
      transaction_type: string | null;
    }>;
    next_cursor: string | null;
  }> {
    const {
      userId,
      filter = 'all',
      limit: limitRaw = 50,
      cursor,
    } = params;
    const limit = Math.min(Math.max(limitRaw, 1), 100);
    const decoded = decodeKeysetCursor(cursor);

    let q = this.supabase
      .getClient()
      .from('credit_ledger')
      .select(
        'id, created_at, delta, balance_after, reason, ref_type, ref_id, transaction_type',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (filter === 'purchases') {
      q = q.gt('delta', 0).eq('transaction_type', 'purchase');
    } else if (filter === 'spending') {
      q = q.lt('delta', 0);
    } else if (filter === 'grants') {
      q = q.gt('delta', 0).eq('transaction_type', 'subscription_grant');
    } else if (filter === 'adjustments') {
      q = q.eq('transaction_type', 'adjustment');
    }

    if (decoded) {
      q = q.or(
        `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
      );
    }

    const { data, error } = await q;
    if (error) {
      this.logger.warn(`credit_ledger list failed: ${error.message}`);
      return { entries: [], next_cursor: null };
    }

    const rows = (data ?? []) as Array<{
      id: string;
      created_at: string;
      delta: number;
      balance_after: number;
      reason: string;
      ref_type: string | null;
      ref_id: string | null;
      transaction_type: string | null;
    }>;
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = slice[slice.length - 1];
    const next_cursor =
      hasMore && last
        ? encodeKeysetCursor(last.created_at, last.id)
        : null;
    return { entries: slice, next_cursor };
  }

  /** Call after publish/activate fails post-spend — compensates without refunding Stripe. */
  async reverseSpendByRef(
    userId: string,
    refType: string,
    refId: string,
    reason: string,
  ): Promise<{ reversed: boolean; skipped?: boolean }> {
    const auditId = await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'credits.reverse',
      subjectType: refType,
      subjectId: refId,
      payload: { reason },
    });
    const { data, error } = await this.supabase.getClient().rpc(
      'reverse_spend_for_ref',
      {
        p_user_id: userId,
        p_ref_type: refType,
        p_ref_id: refId,
        p_reason: reason,
        p_audit_event_id: auditId,
      },
    );
    if (error) {
      this.logger.warn(`reverse_spend_for_ref failed: ${error.message}`);
      return { reversed: false, skipped: true };
    }
    const row = data as { skipped?: boolean; reversed?: boolean };
    if (row?.skipped) {
      return { reversed: false, skipped: true };
    }
    return { reversed: true };
  }

  async revokeForPaymentRefund(
    userId: string,
    paymentIntentId: string,
    amount: number,
  ): Promise<{ skipped: boolean; balanceAfter?: number }> {
    if (amount < 1) {
      return { skipped: true };
    }
    const auditId = await this.audit.recordAuditEvent({
      actorUserId: null,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'credits.refund_revoke',
      subjectType: 'payment_intent',
      subjectId: paymentIntentId,
      payload: { user_id: userId, amount },
    });
    const { data, error } = await this.supabase.getClient().rpc(
      'revoke_credits_for_payment_refund',
      {
        p_user_id: userId,
        p_payment_intent_id: paymentIntentId,
        p_amount: amount,
        p_audit_event_id: auditId,
      },
    );
    if (error) {
      this.logger.warn(`revoke_credits_for_payment_refund: ${error.message}`);
      return { skipped: true };
    }
    const row = data as { skipped?: boolean; balance_after?: number };
    if (row?.skipped) {
      return { skipped: true };
    }
    return {
      skipped: false,
      balanceAfter: row?.balance_after,
    };
  }

  async expireDueLots(): Promise<number> {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('expire_due_credit_lots');
    if (error) {
      this.logger.warn(`expire_due_credit_lots: ${error.message}`);
      return 0;
    }
    return typeof data === 'number' ? data : Number(data) || 0;
  }
}

export { CREDIT_COSTS };
