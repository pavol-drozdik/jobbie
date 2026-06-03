import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type ConsentType =
  | 'marketing_profile'
  | 'marketing_cv'
  | 'newsletter'
  | 'job_alert_newsletter';

/** Append-only consent audit — service_role insert only; no client DML on consent_events. */
@Injectable()
export class ConsentEventsService {
  private readonly logger = new Logger(ConsentEventsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async record(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    source: string,
  ): Promise<void> {
    const { error } = await this.supabase.getClient().from('consent_events').insert({
      user_id: userId,
      consent_type: consentType,
      granted,
      source: source.slice(0, 200),
    });
    if (error) {
      this.logger.warn(
        `consent_events insert failed user=${userId} type=${consentType}: ${error.message}`,
      );
    }
  }
}
