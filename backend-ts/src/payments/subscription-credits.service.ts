import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from './stripe.service';
import { CreditsService } from '../billing/credits.service';

function resolveSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice,
): string | null {
  const subRef = invoice.subscription;
  if (typeof subRef === 'string') {
    return subRef;
  }
  if (
    subRef &&
    typeof subRef === 'object' &&
    'id' in subRef &&
    typeof (subRef as { id: unknown }).id === 'string'
  ) {
    return (subRef as { id: string }).id;
  }
  return null;
}

/** Monthly subscription grants — idempotent via stripe_invoice_id / subscription_period ref. */
@Injectable()
export class SubscriptionCreditsService {
  private readonly logger = new Logger(SubscriptionCreditsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly audit: AuditService,
    private readonly stripeService: StripeService,
    private readonly notifications: NotificationsService,
    private readonly credits: CreditsService,
  ) {}

  private async ledgerHasPaidInvoiceGrant(
    userId: string,
    invoiceId: string,
  ): Promise<boolean> {
    const { data } = await this.supabaseService
      .getClient()
      .from('credit_ledger')
      .select('id')
      .eq('user_id', userId)
      .eq('stripe_invoice_id', invoiceId)
      .gt('delta', 0)
      .maybeSingle();
    return !!data;
  }

  private async ledgerHasFreePeriodGrant(
    userId: string,
    periodYyyymm: string,
  ): Promise<boolean> {
    const { data } = await this.supabaseService
      .getClient()
      .from('credit_ledger')
      .select('id')
      .eq('user_id', userId)
      .eq('ref_type', 'subscription_period')
      .eq('ref_id', periodYyyymm)
      .gt('delta', 0)
      .maybeSingle();
    return !!data;
  }

  /**
   * Idempotent: one grant per Stripe invoice (subscription_create / subscription_cycle).
   */
  async grantFromPaidSubscriptionInvoice(
    invoice: Stripe.Invoice,
  ): Promise<{ applied: boolean }> {
    const subscriptionId = resolveSubscriptionIdFromInvoice(invoice);
    if (!subscriptionId) {
      return { applied: false };
    }
    const billingReason = invoice.billing_reason;
    if (
      billingReason !== 'subscription_create' &&
      billingReason !== 'subscription_cycle'
    ) {
      return { applied: false };
    }
    const supabase = this.supabaseService.getClient();
    let userId: string | null = null;
    let planId: string | null = null;
    const { data: usRow } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    if (usRow) {
      const row = usRow as { user_id: string; plan_id: string };
      userId = row.user_id;
      planId = row.plan_id;
    } else {
      const sub = await this.stripeService.retrieveSubscription(subscriptionId);
      if (sub) {
        const meta = (sub.metadata ?? {}) as Record<string, string>;
        userId = meta.user_id?.trim() || null;
        planId = meta.plan_id?.trim() || null;
      }
      if (!userId || !planId) {
        const invMeta = (invoice.metadata ?? {}) as Record<string, string>;
        userId = userId || invMeta.user_id?.trim() || null;
        planId = planId || invMeta.plan_id?.trim() || null;
      }
    }
    if (!userId || !planId) {
      return { applied: false };
    }
    const { data: planRow, error: planErr } = await supabase
      .from('subscription_plans')
      .select('monthly_credits')
      .eq('id', planId)
      .maybeSingle();
    if (planErr || !planRow) {
      return { applied: false };
    }
    const monthly = (planRow as { monthly_credits: number }).monthly_credits;
    if (monthly < 1) {
      return { applied: false };
    }
    const { error: insErr } = await supabase
      .from('subscription_period_credit_grants')
      .insert({
        user_id: userId,
        credits: monthly,
        grant_source: 'stripe_invoice',
        stripe_invoice_id: invoice.id,
        period_yyyymm: null,
      });
    if (insErr) {
      if (insErr.code === '23505') {
        if (await this.ledgerHasPaidInvoiceGrant(userId, invoice.id)) {
          return { applied: true };
        }
        this.logger.warn(
          `subscription_period_credit_grants duplicate without ledger for invoice ${invoice.id}; retrying grant`,
        );
      } else {
        throw new ServiceUnavailableException(insErr.message);
      }
    } else {
      await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'credits.subscription_invoice',
      subjectType: 'stripe_invoice',
      subjectId: invoice.id,
      payload: {
        subscription_id: subscriptionId,
        credits_added: monthly,
        billing_reason: billingReason,
      },
    });
    }
    await this.credits.grant(userId, monthly, {
      reason: 'monthly_plan_grant',
      source: 'subscription_grant',
      expiresAt: this.credits.paidGrantExpiresAt(),
      stripeInvoiceId: invoice.id,
      refType: 'stripe_invoice',
      refId: invoice.id,
    });
    await this.notifications.createForUser({
      userId,
      type: 'payment_received',
      title: 'Mesačné kredity pripísané',
      body: `Na váš účet bolo pripísaných ${monthly} kreditov z predplatného.`,
      metadata: {},
    });
    return { applied: true };
  }

  /**
   * Grants free-plan monthly credits for UTC calendar month `periodYyyymm` (e.g. 2026-05).
   */
  async runFreeMonthlyGrants(periodYyyymm: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { data: planRow, error: planErr } = await supabase
      .from('subscription_plans')
      .select('id, monthly_credits')
      .eq('slug', 'zadarmo')
      .maybeSingle();
    if (planErr || !planRow) {
      this.logger.warn(`runFreeMonthlyGrants: no zadarmo plan (${planErr?.message})`);
      return;
    }
    const plan = planRow as { id: string; monthly_credits: number };
    const credits = plan.monthly_credits;
    if (credits < 1) {
      return;
    }
    const { data: subs, error: subsErr } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('plan_id', plan.id)
      .eq('status', 'active');
    if (subsErr || !subs?.length) {
      if (subsErr) {
        this.logger.warn(`runFreeMonthlyGrants: ${subsErr.message}`);
      }
      return;
    }
    for (const row of subs as { user_id: string }[]) {
      await this.tryGrantFreeMonthlyForUser(row.user_id, periodYyyymm, credits);
    }
  }

  private async tryGrantFreeMonthlyForUser(
    userId: string,
    periodYyyymm: string,
    credits: number,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { error: insErr } = await supabase
      .from('subscription_period_credit_grants')
      .insert({
        user_id: userId,
        credits,
        grant_source: 'free_monthly_cron',
        stripe_invoice_id: null,
        period_yyyymm: periodYyyymm,
      });
    if (insErr) {
      if (insErr.code === '23505') {
        if (await this.ledgerHasFreePeriodGrant(userId, periodYyyymm)) {
          return;
        }
        this.logger.warn(
          `subscription_period_credit_grants duplicate without ledger for ${userId} ${periodYyyymm}; retrying grant`,
        );
      } else {
        this.logger.warn(
          `tryGrantFreeMonthlyForUser insert ${userId}: ${insErr.message}`,
        );
        return;
      }
    } else {
      await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'credits.subscription_monthly_free',
      subjectType: 'subscription_period',
      subjectId: periodYyyymm,
      payload: { credits_added: credits, period: periodYyyymm },
    });
    }
    await this.credits.grant(userId, credits, {
      reason: 'monthly_plan_grant',
      source: 'free_grant',
      expiresAt: this.credits.freeGrantExpiresAt(),
      grantPeriod: periodYyyymm,
      refType: 'subscription_period',
      refId: periodYyyymm,
    });
    await this.notifications.createForUser({
      userId,
      type: 'payment_received',
      title: 'Mesačné kredity (Zadarmo)',
      body: `Na váš účet bolo pripísaných ${credits} kreditov za mesiac ${periodYyyymm}.`,
      metadata: {},
    });
  }
}
