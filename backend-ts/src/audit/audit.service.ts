import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { isNodeProduction } from '../common/runtime-env.util';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { computeAuditRowHash, newAuditEventId, AUDIT_CHAIN_GENESIS } from './audit-hash';
import type { AuditRecordInput, AuthSecurityEventInput } from './audit.types';

const MAX_CHAIN_RETRIES = 8;

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  onModuleInit(): void {
    if (isNodeProduction() && !this.config.get<string>('AUDIT_CHAIN_SECRET')?.trim()) {
      throw new Error(
        'AUDIT_CHAIN_SECRET must be set in production for tamper-evident audit logging.',
      );
    }
  }

  private getChainSecret(): string {
    const s = this.config.get<string>('AUDIT_CHAIN_SECRET')?.trim();
    if (s) {
      return s;
    }
    return 'dev-only-insecure-audit-secret-change-me';
  }

  async getChainTip(): Promise<string> {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('get_audit_chain_tip');
    if (error || data === null || data === undefined) {
      return AUDIT_CHAIN_GENESIS;
    }
    return String(data);
  }

  /**
   * Append an immutable audit row with HMAC chain. Retries on concurrent writers.
   */
  async recordAuditEvent(input: AuditRecordInput): Promise<string | null> {
    const secret = this.getChainSecret();
    const payload = { ...input.payload };
    for (let attempt = 0; attempt < MAX_CHAIN_RETRIES; attempt += 1) {
      const id = newAuditEventId();
      const occurredAtIso = new Date().toISOString();
      const prev = await this.getChainTip();
      const rowHash = computeAuditRowHash({
        secret,
        prevRowHash: prev,
        eventType: input.eventType,
        occurredAtIso,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        payload,
      });
      const { data: rpcData, error } = await this.supabase
        .getClient()
        .rpc('insert_audit_event', {
          p_id: id,
          p_occurred_at: occurredAtIso,
          p_actor_user_id: input.actorUserId,
          p_actor_ip: input.actorIp,
          p_actor_user_agent: input.actorUserAgent,
          p_session_id: input.sessionId,
          p_device_id: input.deviceId,
          p_event_type: input.eventType,
          p_subject_type: input.subjectType,
          p_subject_id: input.subjectId,
          p_payload: payload,
          p_prev_row_hash: prev,
          p_row_hash: rowHash,
        });
      if (!error && rpcData) {
        return String(rpcData);
      }
      const msg = error?.message ?? '';
      if (
        msg.includes('AUDIT_CHAIN_CONFLICT') ||
        error?.code === 'P0001'
      ) {
        continue;
      }
      this.logger.warn(`recordAuditEvent failed: ${msg}`);
      return null;
    }
    this.logger.warn('recordAuditEvent exhausted retries');
    return null;
  }

  async recordAuthSecurityEvent(input: AuthSecurityEventInput): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().from('auth_security_events').insert({
        email_normalized: input.emailNormalized,
        actor_user_id: input.actorUserId,
        event_kind: input.eventKind,
        success: input.success,
        ip: input.ip,
        user_agent: input.userAgent,
        device_id: input.deviceId,
        metadata: input.metadata ?? {},
        audit_event_id: input.auditEventId ?? null,
      });
      if (error) {
        this.logger.warn(`recordAuthSecurityEvent: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`recordAuthSecurityEvent: ${String(err)}`);
    }
  }

  async recordCreditLedger(input: {
    readonly userId: string;
    readonly delta: number;
    readonly balanceAfter: number;
    readonly reason: string;
    readonly refType: string | null;
    readonly refId: string | null;
    readonly paymentIntentId?: string | null;
    readonly auditEventId?: string | null;
    readonly lotId?: string | null;
    readonly transactionType?: string | null;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().from('credit_ledger').insert({
        user_id: input.userId,
        delta: input.delta,
        balance_after: input.balanceAfter,
        reason: input.reason,
        ref_type: input.refType,
        ref_id: input.refId,
        payment_intent_id: input.paymentIntentId ?? null,
        audit_event_id: input.auditEventId ?? null,
        lot_id: input.lotId ?? null,
        transaction_type: input.transactionType ?? null,
      });
      if (error) {
        this.logger.warn(`recordCreditLedger: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`recordCreditLedger: ${String(err)}`);
    }
  }

  async recordProfileFieldChanges(input: {
    readonly profileId: string;
    readonly changes: ReadonlyArray<{
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    }>;
    readonly auditEventId: string | null;
  }): Promise<void> {
    if (input.changes.length === 0) {
      return;
    }
    const rows = input.changes.map((c) => ({
      profile_id: input.profileId,
      field_name: c.fieldName,
      old_value: c.oldValue,
      new_value: c.newValue,
      audit_event_id: input.auditEventId,
    }));
    try {
      const { error } = await this.supabase
        .getClient()
        .from('profile_field_changes')
        .insert(rows);
      if (error) {
        this.logger.warn(`recordProfileFieldChanges: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`recordProfileFieldChanges: ${String(err)}`);
    }
  }

  async verifyChainIntegrity(
    fromIso?: string,
    toIso?: string,
  ): Promise<{ valid: boolean; checked: number; detail?: string }> {
    const secret = this.getChainSecret();
    let q = this.supabase
      .getClient()
      .from('audit_events')
      .select('*')
      .order('occurred_at', { ascending: true })
      .limit(50000);
    if (fromIso?.trim()) {
      q = q.gte('occurred_at', fromIso.trim());
    }
    if (toIso?.trim()) {
      q = q.lte('occurred_at', toIso.trim());
    }
    const { data, error } = await q;
    if (error) {
      return { valid: false, checked: 0, detail: error.message };
    }
    const rows = (data ?? []) as Array<{
      prev_row_hash: string;
      row_hash: string;
      event_type: string;
      occurred_at: string;
      subject_type: string | null;
      subject_id: string | null;
      payload: Record<string, unknown> | null;
    }>;
    let prevExpected = AUDIT_CHAIN_GENESIS;
    let i = 0;
    for (const row of rows) {
      if (row.prev_row_hash !== prevExpected) {
        return {
          valid: false,
          checked: i,
          detail: `prev_row_hash mismatch at index ${i}`,
        };
      }
      const computed = computeAuditRowHash({
        secret,
        prevRowHash: prevExpected,
        eventType: row.event_type,
        occurredAtIso: row.occurred_at,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        payload: row.payload ?? {},
      });
      if (computed !== row.row_hash) {
        return {
          valid: false,
          checked: i,
          detail: 'row_hash mismatch',
        };
      }
      prevExpected = row.row_hash;
      i += 1;
    }
    return { valid: true, checked: rows.length };
  }
}
