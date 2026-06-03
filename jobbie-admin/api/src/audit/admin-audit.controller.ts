import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { AuditService } from './audit.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuditEventsListDto } from './admin-audit.dto';
import {
  csvEscape,
  rowToAuditEventDto,
} from './admin-audit.dto';
import {
  buildAuditEventsQuery,
  fetchActorLabels,
} from './admin-audit-query.util';

@Controller('admin/audit')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireAppRoles('admin')
@RequireRecentLogin()
export class AdminAuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('event-types')
  async listEventTypes(
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: string[] }> {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    const { data, error } = await this.supabase
      .getClient()
      .from('audit_events')
      .select('event_type')
      .order('occurred_at', { ascending: false })
      .limit(5000);
    if (error) {
      return { items: [] };
    }
    const seen = new Set<string>();
    const items: string[] = [];
    for (const row of data ?? []) {
      const t = String((row as { event_type?: string }).event_type ?? '').trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      items.push(t);
      if (items.length >= limit) break;
    }
    return { items };
  }

  @Get('events')
  async listEvents(
    @Query('user_id') userId?: string,
    @Query('event_type') eventType?: string,
    @Query('subject_id') subjectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ): Promise<AuditEventsListDto> {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const client = this.supabase.getClient();
    const q = buildAuditEventsQuery(client, {
      userId,
      eventType,
      subjectId,
      from,
      to,
      cursor,
      limit,
      ascending: false,
    });
    const { data, error } = await q;
    if (error) {
      return { items: [], next_cursor: null };
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const actorIds = slice
      .map((r) => (r.actor_user_id ? String(r.actor_user_id) : ''))
      .filter(Boolean);
    const actorLabels = await fetchActorLabels(client, actorIds);
    const items = slice.map((r) => rowToAuditEventDto(r, actorLabels));
    const next =
      hasMore && slice.length > 0
        ? String(slice[slice.length - 1]!.occurred_at)
        : null;
    return { items, next_cursor: next };
  }

  @Get('export')
  async exportEvents(
    @Query('user_id') userId: string | undefined,
    @Query('event_type') eventType: string | undefined,
    @Query('subject_id') subjectId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const client = this.supabase.getClient();
    const q = buildAuditEventsQuery(client, {
      userId,
      eventType,
      subjectId,
      from,
      to,
      limit: 100000,
      ascending: true,
    });
    const exp = await q;
    const rawRows = (exp.data ?? []) as Record<string, unknown>[];
    const actorIds = rawRows
      .map((r) => (r.actor_user_id ? String(r.actor_user_id) : ''))
      .filter(Boolean);
    const actorLabels = await fetchActorLabels(client, actorIds);
    const rows = rawRows.map((r) => rowToAuditEventDto(r, actorLabels));

    const fmt = format === 'csv' ? 'csv' : 'jsonl';
    const stamp = new Date().toISOString().slice(0, 10);
    if (fmt === 'csv') {
      const header =
        'id,occurred_at,event_type,actor_user_id,actor_label,actor_ip,actor_user_agent,subject_type,subject_id,session_id,device_id,payload,row_hash\n';
      const lines = rows.map((r) =>
        [
          r.id,
          r.occurred_at,
          r.event_type,
          r.actor_user_id,
          r.actor_label,
          r.actor_ip,
          r.actor_user_agent,
          r.subject_type,
          r.subject_id,
          r.session_id,
          r.device_id,
          r.payload,
          r.row_hash,
        ]
          .map(csvEscape)
          .join(','),
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="jobbie-audit-${stamp}.csv"`,
      );
      res.send(header + lines.join('\n'));
      return;
    }
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="jobbie-audit-${stamp}.jsonl"`,
    );
    res.send(rows.map((r) => JSON.stringify(r)).join('\n'));
  }

  @Post('verify-chain')
  async verifyChain(
    @Body()
    body: { from?: string; to?: string },
  ): Promise<{ valid: boolean; checked: number; detail?: string }> {
    return this.audit.verifyChainIntegrity(body?.from, body?.to);
  }
}
