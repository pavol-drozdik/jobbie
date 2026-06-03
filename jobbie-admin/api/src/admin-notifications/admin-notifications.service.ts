import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { CurrentUser } from '../auth/auth.types';
import type {
  AdminBroadcastDto,
  BroadcastAudience,
} from './admin-notifications.dto';

@Injectable()
export class AdminNotificationsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async countRecipients(audience: BroadcastAudience = 'all'): Promise<number> {
    const client = this.supabase.getClient();
    let q = client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false);
    if (audience === 'company') {
      q = q.eq('role', 'company');
    } else if (audience === 'individual') {
      q = q.eq('role', 'individual');
    }
    const { count, error } = await q;
    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  }

  /**
   * Inserts one in-app notification per profile (batched). In-app only — no email/push/SMS.
   */
  async broadcastToAllUsers(
    admin: CurrentUser,
    input: AdminBroadcastDto,
  ): Promise<{ sent: number; broadcast_id: string }> {
    const client = this.supabase.getClient();
    const audience: BroadcastAudience = input.audience ?? 'all';
    const batchSize = 500;
    let offset = 0;
    let sent = 0;
    const broadcastId = `bc_${Date.now()}`;
    const metadata: Record<string, string | undefined> = {
      broadcast_id: broadcastId,
      audience,
    };
    if (input.link_path?.trim()) {
      metadata.link_path = input.link_path.trim();
    }

    for (;;) {
      let q = client.from('profiles').select('id').eq('is_deleted', false);
      if (audience === 'company') {
        q = q.eq('role', 'company');
      } else if (audience === 'individual') {
        q = q.eq('role', 'individual');
      }
      const { data: profiles, error } = await q.range(offset, offset + batchSize - 1);
      if (error) {
        throw new Error(error.message);
      }
      if (!profiles?.length) {
        break;
      }

      const rows = (profiles as { id: string }[]).map((p) => ({
        user_id: p.id,
        type: 'admin_broadcast',
        title: input.title.trim(),
        body: input.body?.trim() || null,
        metadata,
      }));

      const { error: insertError } = await client
        .from('user_notifications')
        .insert(rows);
      if (insertError) {
        throw new Error(insertError.message);
      }

      sent += profiles.length;
      if (profiles.length < batchSize) {
        break;
      }
      offset += batchSize;
    }

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'notification.admin_broadcast',
      subjectType: 'platform',
      subjectId: broadcastId,
      payload: {
        title: input.title.trim(),
        body: input.body?.trim() || null,
        link_path: input.link_path?.trim() || null,
        audience,
        sent,
      },
    });

    return { sent, broadcast_id: broadcastId };
  }
}
