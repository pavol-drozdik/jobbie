import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from './audit.service';
import type { CurrentUser } from '../auth/auth.types';
import { getPwaPublicUrl } from '../admin-overview/pwa-public-url.util';

export type ContentReportListItem = {
  readonly id: string;
  readonly reporter_user_id: string | null;
  readonly target_type: string;
  readonly target_id: string;
  readonly reason: string;
  readonly status: string;
  readonly created_at: string;
  readonly preview_title: string | null;
  readonly preview_subtitle: string | null;
  readonly public_url: string | null;
  readonly claimed_at: string | null;
  readonly claimed_by: string | null;
  readonly age_hours: number;
  readonly escalated: boolean;
};

/** Admin-only moderation — every decision must call audit.recordAuditEvent (see controllers). */
@Injectable()
export class AdminModerationService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async listPendingBanners(limit = 50) {
    const { data } = await this.supabase
      .getClient()
      .from('banner_ads')
      .select('id, title, owner_id, placement, status, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));
    return data ?? [];
  }

  async countOpenReports(): Promise<number> {
    const { count, error } = await this.supabase
      .getClient()
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    if (error) {
      throw new InternalServerErrorException(
        `content_reports count failed: ${error.message}`,
      );
    }
    return count ?? 0;
  }

  async listOpenReports(limit = 50): Promise<ContentReportListItem[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('content_reports')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(Math.min(limit, 100));
    if (error) {
      throw new InternalServerErrorException(
        `content_reports list failed: ${error.message}`,
      );
    }
    const rows = data ?? [];
    return Promise.all(rows.map((r) => this.enrichReport(r as Record<string, unknown>)));
  }

  private async enrichReport(
    row: Record<string, unknown>,
  ): Promise<ContentReportListItem> {
    const targetType = String(row.target_type ?? '');
    const targetId = String(row.target_id ?? '');
    const preview = await this.resolveTargetPreview(targetType, targetId);
    const createdAt = String(row.created_at ?? '');
    const ageMs = createdAt
      ? Date.now() - new Date(createdAt).getTime()
      : 0;
    const ageHours = Math.max(0, Math.floor(ageMs / 3_600_000));
    return {
      id: String(row.id ?? ''),
      reporter_user_id:
        row.reporter_user_id != null ? String(row.reporter_user_id) : null,
      target_type: targetType,
      target_id: targetId,
      reason: String(row.reason ?? ''),
      status: String(row.status ?? ''),
      created_at: createdAt,
      preview_title: preview.title,
      preview_subtitle: preview.subtitle,
      public_url: preview.publicUrl,
      claimed_at:
        row.claimed_at != null ? String(row.claimed_at) : null,
      claimed_by:
        row.claimed_by != null ? String(row.claimed_by) : null,
      age_hours: ageHours,
      escalated: ageHours >= 24,
    };
  }

  async claimReport(
    moderator: CurrentUser,
    reportId: string,
  ): Promise<{ ok: boolean }> {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('content_reports')
      .update({
        claimed_at: now,
        claimed_by: moderator.id,
      })
      .eq('id', reportId)
      .eq('status', 'open')
      .select('id')
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Report not found or not open');
    }
    void this.audit.recordAuditEvent({
      actorUserId: moderator.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'moderation.report.claimed',
      subjectType: 'content_report',
      subjectId: reportId,
      payload: {},
    });
    return { ok: true };
  }

  private async resolveTargetPreview(
    targetType: string,
    targetId: string,
  ): Promise<{
    title: string | null;
    subtitle: string | null;
    publicUrl: string | null;
  }> {
    const base = getPwaPublicUrl();
    const client = this.supabase.getClient();
    switch (targetType) {
      case 'job_offer': {
        const { data } = await client
          .from('job_offers')
          .select('title, is_active, is_draft')
          .eq('id', targetId)
          .maybeSingle();
        if (!data) {
          return { title: null, subtitle: 'Ponuka nenájdená', publicUrl: null };
        }
        const t = data as { title?: string; is_active?: boolean; is_draft?: boolean };
        return {
          title: t.title?.trim() || null,
          subtitle: t.is_active && !t.is_draft ? 'Aktívna' : 'Neaktívna / koncept',
          publicUrl: `${base}/app/jobs/${targetId}`,
        };
      }
      case 'company_profile': {
        const { data } = await client
          .from('profiles')
          .select('display_name, company_name, public_profile_enabled')
          .eq('id', targetId)
          .maybeSingle();
        if (!data) {
          return { title: null, subtitle: 'Profil nenájdený', publicUrl: null };
        }
        const p = data as {
          display_name?: string;
          company_name?: string;
          public_profile_enabled?: boolean;
        };
        const name =
          p.company_name?.trim() || p.display_name?.trim() || null;
        return {
          title: name,
          subtitle: p.public_profile_enabled === false ? 'Verejný profil vypnutý' : 'Profil firmy',
          publicUrl: `${base}/profil/${targetId}`,
        };
      }
      case 'company_ad': {
        const { data } = await client
          .from('company_ads')
          .select('title, status')
          .eq('id', targetId)
          .maybeSingle();
        if (!data) {
          return { title: null, subtitle: 'Inzerát nenájdený', publicUrl: null };
        }
        const ad = data as { title?: string; status?: string };
        return {
          title: ad.title?.trim() || null,
          subtitle: ad.status ? `Stav: ${ad.status}` : 'Inzerát profesionála',
          publicUrl: `${base}/profesionali/${targetId}`,
        };
      }
      case 'banner_ad': {
        const { data } = await client
          .from('banner_ads')
          .select('title, status')
          .eq('id', targetId)
          .maybeSingle();
        if (!data) {
          return { title: null, subtitle: 'Banner nenájdený', publicUrl: null };
        }
        const b = data as { title?: string; status?: string };
        return {
          title: b.title?.trim() || null,
          subtitle: b.status ? `Stav: ${b.status}` : null,
          publicUrl: null,
        };
      }
      case 'company_review': {
        return {
          title: 'Recenzia firmy',
          subtitle: targetId,
          publicUrl: null,
        };
      }
      case 'chat_message': {
        return {
          title: 'Správa v chate',
          subtitle: targetId,
          publicUrl: `${base}/chat`,
        };
      }
      default:
        return { title: null, subtitle: targetType, publicUrl: null };
    }
  }

  async createReport(
    reporterUserId: string,
    input: {
      target_type: string;
      target_id: string;
      reason: string;
    },
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from('content_reports')
      .insert({
        reporter_user_id: reporterUserId,
        target_type: input.target_type,
        target_id: input.target_id,
        reason: input.reason,
        status: 'open',
      })
      .select('id')
      .single();
    if (error) {
      throw new NotFoundException('Report could not be created');
    }
    void this.audit.recordAuditEvent({
      actorUserId: reporterUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'content.report.created',
      subjectType: input.target_type,
      subjectId: input.target_id,
      payload: { report_id: (data as { id: string }).id },
    });
    return data;
  }

  async moderateBanner(
    moderator: CurrentUser,
    bannerId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ): Promise<{ ok: boolean }> {
    const status = decision === 'approve' ? 'active' : 'rejected';
    const { data, error } = await this.supabase
      .getClient()
      .from('banner_ads')
      .update({ status })
      .eq('id', bannerId)
      .select('id, owner_id')
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Banner not found');
    }
    await this.recordDecision(moderator, {
      subject_type: 'banner_ad',
      subject_id: bannerId,
      decision,
      reason,
    });
    return { ok: true };
  }

  async moderateJob(
    moderator: CurrentUser,
    jobId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ): Promise<{ ok: boolean }> {
    const patch =
      decision === 'approve'
        ? { is_active: true, is_deleted: false }
        : { is_active: false, is_deleted: true };
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .update(patch)
      .eq('id', jobId)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Job not found');
    }
    await this.recordDecision(moderator, {
      subject_type: 'job_offer',
      subject_id: jobId,
      decision,
      reason,
    });
    return { ok: true };
  }

  async dismissReport(
    moderator: CurrentUser,
    reportId: string,
    options?: { note?: string; resolution_code?: string },
  ): Promise<{ ok: boolean }> {
    const client = this.supabase.getClient();
    const { data: report, error: fetchErr } = await client
      .from('content_reports')
      .select('id, target_type, target_id')
      .eq('id', reportId)
      .maybeSingle();
    if (fetchErr || !report) {
      throw new NotFoundException('Report not found');
    }
    const now = new Date().toISOString();
    const { error } = await client
      .from('content_reports')
      .update({
        status: 'dismissed',
        reviewed_at: now,
        reviewed_by: moderator.id,
        handled_at: now,
        handled_by: moderator.id,
        resolution_code: options?.resolution_code?.trim() || null,
      })
      .eq('id', reportId);
    if (error) {
      throw new NotFoundException('Report not found');
    }
    const r = report as { target_type: string; target_id: string };
    void this.audit.recordAuditEvent({
      actorUserId: moderator.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'moderation.report.dismissed',
      subjectType: r.target_type,
      subjectId: r.target_id,
      payload: {
        report_id: reportId,
        note: options?.note?.trim() || null,
        resolution_code: options?.resolution_code?.trim() || null,
      },
    });
    return { ok: true };
  }

  async hideReportedContent(
    moderator: CurrentUser,
    reportId: string,
    options?: { note?: string; resolution_code?: string },
  ): Promise<{ ok: boolean }> {
    const client = this.supabase.getClient();
    const { data: report, error: fetchErr } = await client
      .from('content_reports')
      .select('id, target_type, target_id, status')
      .eq('id', reportId)
      .maybeSingle();
    if (fetchErr || !report) {
      throw new NotFoundException('Report not found');
    }
    const r = report as {
      id: string;
      target_type: string;
      target_id: string;
      status: string;
    };
    if (r.status !== 'open') {
      throw new BadRequestException('Report is not open');
    }

    await this.applyHideForTarget(r.target_type, r.target_id);

    const now = new Date().toISOString();
    await client
      .from('content_reports')
      .update({
        status: 'reviewed',
        reviewed_at: now,
        reviewed_by: moderator.id,
        handled_at: now,
        handled_by: moderator.id,
        resolution_code: options?.resolution_code?.trim() || null,
      })
      .eq('id', reportId);

    void this.audit.recordAuditEvent({
      actorUserId: moderator.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'moderation.report.content_hidden',
      subjectType: r.target_type,
      subjectId: r.target_id,
      payload: {
        report_id: reportId,
        note: options?.note?.trim() || null,
        resolution_code: options?.resolution_code?.trim() || null,
      },
    });

    return { ok: true };
  }

  private async applyHideForTarget(
    targetType: string,
    targetId: string,
  ): Promise<void> {
    const client = this.supabase.getClient();
    switch (targetType) {
      case 'job_offer': {
        const { data, error } = await client
          .from('job_offers')
          .update({ is_active: false, is_draft: true })
          .eq('id', targetId)
          .select('id')
          .maybeSingle();
        if (error || !data) {
          throw new NotFoundException('Job not found');
        }
        return;
      }
      case 'company_profile': {
        const { data, error } = await client
          .from('profiles')
          .update({ public_profile_enabled: false })
          .eq('id', targetId)
          .select('id')
          .maybeSingle();
        if (error || !data) {
          throw new NotFoundException('Profile not found');
        }
        return;
      }
      case 'company_ad': {
        const { data, error } = await client
          .from('company_ads')
          .update({ status: 'paused' })
          .eq('id', targetId)
          .select('id')
          .maybeSingle();
        if (error || !data) {
          throw new NotFoundException('Company ad not found');
        }
        return;
      }
      case 'banner_ad': {
        const { data, error } = await client
          .from('banner_ads')
          .update({ status: 'rejected' })
          .eq('id', targetId)
          .select('id')
          .maybeSingle();
        if (error || !data) {
          throw new NotFoundException('Banner not found');
        }
        return;
      }
      default:
        throw new BadRequestException(
          `Hide is not supported for target_type=${targetType}`,
        );
    }
  }

  async recordDecision(
    moderator: CurrentUser,
    body: {
      subject_type: string;
      subject_id: string;
      decision: string;
      reason?: string;
    },
  ): Promise<void> {
    const auditId = await this.audit.recordAuditEvent({
      actorUserId: moderator.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'moderation.decision',
      subjectType: body.subject_type,
      subjectId: body.subject_id,
      payload: {
        decision: body.decision,
        reason: body.reason ?? null,
      },
    });
    await this.supabase.getClient().from('moderation_decisions').insert({
      subject_type: body.subject_type,
      subject_id: body.subject_id,
      moderator_user_id: moderator.id,
      decision: body.decision,
      reason: body.reason ?? null,
      metadata: {},
      audit_event_id: auditId,
    });
  }
}
