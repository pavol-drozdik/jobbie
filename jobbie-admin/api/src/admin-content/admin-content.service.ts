import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { getPwaPublicUrl } from '../admin-overview/pwa-public-url.util';
import type { CurrentUser } from '../auth/auth.types';

export type AdminJobDetailDto = {
  readonly id: string;
  readonly title: string | null;
  readonly owner_id: string | null;
  readonly company_id: string | null;
  readonly is_active: boolean;
  readonly is_draft: boolean;
  readonly is_deleted: boolean;
  readonly status_label: string;
  readonly created_at: string;
  readonly updated_at: string | null;
  readonly published_at: string | null;
  readonly public_url: string;
  readonly credits_spent: number;
};

export type AdminCompanyAdDetailDto = {
  readonly id: string;
  readonly title: string | null;
  readonly owner_id: string | null;
  readonly status: string | null;
  readonly created_at: string;
  readonly updated_at: string | null;
  readonly city: string | null;
  readonly region: string | null;
  readonly public_url: string;
  readonly credits_spent: number;
};

@Injectable()
export class AdminContentService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async getJob(id: string): Promise<AdminJobDetailDto> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('job_offers')
      .select(
        'id, title, owner_id, company_id, is_active, is_draft, is_deleted, created_at, updated_at, published_at',
      )
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Job not found');
    }
    const row = data as {
      id: string;
      title?: string | null;
      owner_id?: string | null;
      company_id?: string | null;
      is_active?: boolean;
      is_draft?: boolean;
      is_deleted?: boolean;
      created_at?: string;
      updated_at?: string | null;
      published_at?: string | null;
    };
    const creditsSpent = await this.sumCreditsForRef('job_offer', id);
    const base = getPwaPublicUrl();
    return {
      id: row.id,
      title: row.title ?? null,
      owner_id: row.owner_id ?? row.company_id ?? null,
      company_id: row.company_id ?? null,
      is_active: row.is_active === true,
      is_draft: row.is_draft === true,
      is_deleted: row.is_deleted === true,
      status_label: this.jobStatusLabel(row),
      created_at: String(row.created_at ?? ''),
      updated_at: row.updated_at ?? null,
      published_at: row.published_at ?? null,
      public_url: `${base}/app/jobs/${row.id}`,
      credits_spent: creditsSpent,
    };
  }

  async unpublishJob(admin: CurrentUser, id: string): Promise<{ ok: boolean }> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('job_offers')
      .update({ is_active: false, is_draft: true })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Job not found');
    }
    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.job.unpublished',
      subjectType: 'job_offer',
      subjectId: id,
      payload: {},
    });
    return { ok: true };
  }

  async getCompanyAd(id: string): Promise<AdminCompanyAdDetailDto> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('company_ads')
      .select(
        'id, title, owner_id, status, created_at, updated_at, city, region',
      )
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Company ad not found');
    }
    const row = data as {
      id: string;
      title?: string | null;
      owner_id?: string | null;
      status?: string | null;
      created_at?: string;
      updated_at?: string | null;
      city?: string | null;
      region?: string | null;
    };
    const creditsSpent = await this.sumCreditsForRef('company_ad', id);
    const base = getPwaPublicUrl();
    return {
      id: row.id,
      title: row.title ?? null,
      owner_id: row.owner_id ?? null,
      status: row.status ?? null,
      created_at: String(row.created_at ?? ''),
      updated_at: row.updated_at ?? null,
      city: row.city ?? null,
      region: row.region ?? null,
      public_url: `${base}/profesionali/${row.id}`,
      credits_spent: creditsSpent,
    };
  }

  async unpublishCompanyAd(
    admin: CurrentUser,
    id: string,
  ): Promise<{ ok: boolean }> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('company_ads')
      .update({ status: 'paused' })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Company ad not found');
    }
    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.company_ad.unpublished',
      subjectType: 'company_ad',
      subjectId: id,
      payload: {},
    });
    return { ok: true };
  }

  async listApplications(params: {
    jobId?: string;
    userId?: string;
    limit?: number;
    cursor?: string;
  }) {
    if (!params.jobId?.trim() && !params.userId?.trim()) {
      throw new BadRequestException('job_id or user_id is required');
    }
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    let q = this.supabase
      .getClient()
      .from('applications')
      .select(
        'id, job_id, individual_id, status, created_at, updated_at',
        { count: 'exact' },
      )
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (params.jobId?.trim()) {
      q = q.eq('job_id', params.jobId.trim());
    }
    if (params.userId?.trim()) {
      q = q.eq('individual_id', params.userId.trim());
    }
    if (params.cursor?.trim()) {
      q = q.lt('created_at', params.cursor.trim());
    }
    const { data, error } = await q;
    if (error) {
      throw new BadRequestException(error.message);
    }
    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows) as Record<
      string,
      unknown
    >[];
    const last = items[items.length - 1] as { created_at?: string } | undefined;
    return {
      items,
      next_cursor: hasMore && last?.created_at ? String(last.created_at) : null,
    };
  }

  async listChatRooms(userId: string, limit = 50) {
    const cap = Math.min(Math.max(limit, 1), 100);
    const client = this.supabase.getClient();
    const { data: rooms, error } = await client
      .from('chat_rooms')
      .select('id, company_id, individual_id, created_at, updated_at')
      .or(`company_id.eq.${userId},individual_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(cap);
    if (error) {
      throw new BadRequestException(error.message);
    }
    const items = await Promise.all(
      (rooms ?? []).map(async (room) => {
        const r = room as {
          id: string;
          company_id?: string | null;
          individual_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        const { data: lastMsg } = await client
          .from('chat_messages')
          .select('id, created_at, message_type')
          .eq('room_id', r.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const msg = lastMsg as {
          created_at?: string;
          message_type?: string;
        } | null;
        return {
          id: r.id,
          company_id: r.company_id ?? null,
          individual_id: r.individual_id ?? null,
          created_at: r.created_at ?? null,
          updated_at: r.updated_at ?? null,
          last_message_at: msg?.created_at ?? null,
          last_message_type: msg?.message_type ?? null,
        };
      }),
    );
    return { items };
  }

  private jobStatusLabel(row: {
    is_active?: boolean;
    is_draft?: boolean;
    is_deleted?: boolean;
  }): string {
    if (row.is_deleted) return 'deleted';
    if (row.is_draft) return 'draft';
    if (row.is_active) return 'active';
    return 'inactive';
  }

  private async sumCreditsForRef(
    refType: string,
    refId: string,
  ): Promise<number> {
    const { data } = await this.supabase
      .getClient()
      .from('credit_ledger')
      .select('delta')
      .eq('ref_type', refType)
      .eq('ref_id', refId)
      .lt('delta', 0);
    let total = 0;
    for (const row of data ?? []) {
      total += Math.abs(Number((row as { delta: number }).delta) || 0);
    }
    return total;
  }
}
