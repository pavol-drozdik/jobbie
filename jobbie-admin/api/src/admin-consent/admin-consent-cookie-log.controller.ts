import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import type { CookieConsentLogListDto } from './admin-consent-cookie-log.dto';

@Controller('admin/consent')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireAppRoles('admin')
@RequireRecentLogin()
export class AdminConsentCookieLogController {
  private readonly logger = new Logger(AdminConsentCookieLogController.name);

  constructor(private readonly supabase: SupabaseService) {}

  @Get('cookie-log')
  async listCookieLog(
    @Query('user_id') userId?: string,
    @Query('visitor_id') visitorId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ): Promise<CookieConsentLogListDto> {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const client = this.supabase.getClient();
    let q = client
      .from('cookie_consent_log')
      .select(
        'id, visitor_id, user_id, action, analytics, marketing, personalization, policy_version, source, page_path, user_agent, recorded_at',
      )
      .order('recorded_at', { ascending: false })
      .limit(limit + 1);

    if (userId?.trim()) {
      q = q.eq('user_id', userId.trim());
    }
    if (visitorId?.trim()) {
      q = q.eq('visitor_id', visitorId.trim());
    }
    if (action?.trim()) {
      q = q.eq('action', action.trim());
    }
    if (from?.trim()) {
      q = q.gte('recorded_at', from.trim());
    }
    if (to?.trim()) {
      q = q.lte('recorded_at', to.trim());
    }
    if (cursor?.trim()) {
      q = q.lt('recorded_at', cursor.trim());
    }

    const { data, error } = await q;
    if (error) {
      this.logger.warn(`cookie_consent_log query failed: ${error.message}`);
      if (
        /cookie_consent_log/i.test(error.message) &&
        /does not exist|schema cache/i.test(error.message)
      ) {
        throw new InternalServerErrorException(
          'Tabuľka cookie_consent_log neexistuje. Spustite migráciu supabase/migrations/20260715120000_cookie_consent_log.sql (Supabase SQL alebo supabase db push).',
        );
      }
      throw new InternalServerErrorException(
        `Cookie consent log: ${error.message}`,
      );
    }
    const rows = (data ?? []) as CookieConsentLogListDto['items'];
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const next =
      hasMore && slice.length > 0
        ? String(slice[slice.length - 1]!.recorded_at)
        : null;
    return { items: slice, next_cursor: next };
  }
}
