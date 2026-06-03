import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';

const MAX_GRANT_AMOUNT = 500;

@Injectable()
export class AdminBillingService {
  private readonly logger = new Logger(AdminBillingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async grantCredits(
    adminUserId: string,
    targetUserId: string,
    amount: number,
    reason: string,
  ): Promise<{ balance_after: number }> {
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_GRANT_AMOUNT) {
      throw new BadRequestException(
        `Amount must be an integer between 1 and ${MAX_GRANT_AMOUNT}.`,
      );
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      throw new BadRequestException('Reason is required (min 3 characters).');
    }

    const auditId = await this.audit.recordAuditEvent({
      actorUserId: adminUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.credits.granted',
      subjectType: 'profile',
      subjectId: targetUserId,
      payload: { amount, reason: trimmedReason },
    });

    const refId = `admin-grant:${adminUserId}:${Date.now()}`;
    const { data, error } = await this.supabase.getClient().rpc('grant_credits', {
      p_user_id: targetUserId,
      p_amount: amount,
      p_source: 'adjustment',
      p_reason: trimmedReason,
      p_expires_at: null,
      p_grant_period: null,
      p_stripe_invoice_id: null,
      p_payment_intent_id: null,
      p_audit_event_id: auditId,
      p_ref_type: 'admin_grant',
      p_ref_id: refId,
    });

    if (error) {
      this.logger.warn(`grant_credits failed: ${error.message}`);
      throw new ServiceUnavailableException(error.message);
    }

    return {
      balance_after:
        (data as { balance_after?: number })?.balance_after ?? 0,
    };
  }

  async listLedger(userId: string, limit = 50) {
    const cap = Math.min(Math.max(limit, 1), 100);
    const { data, error } = await this.supabase
      .getClient()
      .from('credit_ledger')
      .select(
        'id, created_at, delta, balance_after, reason, ref_type, ref_id, transaction_type',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(cap);
    if (error) {
      throw new ServiceUnavailableException(error.message);
    }
    return { items: data ?? [] };
  }

  async listStripeFulfillmentGaps(userId: string) {
    const client = this.supabase.getClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const { count: failedWebhooks } = await client
      .from('stripe_webhook_events')
      .select('stripe_event_id', { count: 'exact', head: true })
      .eq('processing_status', 'failed')
      .gte('received_at', sevenDaysAgo.toISOString());

    const { data: ledgerPurchases } = await client
      .from('credit_ledger')
      .select('ref_id')
      .eq('user_id', userId)
      .eq('transaction_type', 'purchase')
      .not('ref_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const piIds = (ledgerPurchases ?? [])
      .map((r) => String((r as { ref_id?: string }).ref_id ?? ''))
      .filter((id) => id.startsWith('pi_'));

    const missing: string[] = [];
    for (const pi of piIds) {
      const { data } = await client
        .from('stripe_credit_fulfillments')
        .select('payment_intent_id')
        .eq('payment_intent_id', pi)
        .maybeSingle();
      if (!data) {
        missing.push(pi);
      }
    }

    return {
      failed_webhooks_7d: failedWebhooks ?? 0,
      missing_fulfillments: missing,
    };
  }
}
