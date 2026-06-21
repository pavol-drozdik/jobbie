import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import type { RecordCookieConsentDto } from './cookie-consent-log.dto';

@Injectable()
export class CookieConsentLogService {
  private readonly logger = new Logger(CookieConsentLogService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async record(
    dto: RecordCookieConsentDto,
    userId: string | null,
    req: Request,
  ): Promise<void> {
    const userAgentRaw = req.headers['user-agent']
    const userAgent =
      typeof userAgentRaw === 'string' ? userAgentRaw.slice(0, 500) : null

    const { error } = await this.supabase.getClient().from('cookie_consent_log').insert({
      visitor_id: dto.visitor_id,
      user_id: userId,
      action: dto.action,
      analytics: dto.analytics,
      marketing: dto.marketing,
      personalization: dto.personalization,
      policy_version: dto.policy_version,
      source: dto.source.slice(0, 50),
      page_path: dto.page_path?.slice(0, 512) ?? null,
      user_agent: userAgent,
    })

    if (error) {
      this.logger.warn(
        `cookie_consent_log insert failed visitor=${dto.visitor_id}: ${error.message}`,
      )
    }
  }
}
