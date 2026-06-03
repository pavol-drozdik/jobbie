import { Injectable, Logger } from '@nestjs/common';
import { fetchWithTimeout } from '../common/fetch-with-timeout';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentEventsService } from '../consent/consent-events.service';
import { SubscribeDto } from './subscribe.dto';

const MAILERLITE_URL = 'https://connect.mailerlite.com/api/subscribers';

type MailerLiteStatus = 'pending' | 'synced' | 'failed';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly consentEvents: ConsentEventsService,
  ) {}

  /**
   * Persists subscriber then pushes to MailerLite. HTTP layer always returns success
   * after DB write; MailerLite failures set `mailerlite_status` to `failed` and are logged.
   * SECURITY: SubscribeDto.consent must be true (class-validator) before this runs.
   */
  async subscribe(dto: SubscribeDto): Promise<{ ok: true; id: string }> {
    const emailNorm = dto.email.trim().toLowerCase();
    const nameTrim = dto.name?.trim() ? dto.name.trim().slice(0, 200) : null;
    const client = this.supabase.getClient();

    const { data: existing } = await client
      .from('subscribers')
      .select('id, mailerlite_status')
      .eq('email', emailNorm)
      .maybeSingle();

    let rowId: string;
    if (existing && typeof (existing as { id?: string }).id === 'string') {
      rowId = (existing as { id: string }).id;
      const { error: upErr } = await client
        .from('subscribers')
        .update({
          name: nameTrim,
          consent: true,
          mailerlite_status: 'pending',
        })
        .eq('id', rowId);
      if (upErr) {
        this.logger.warn(`subscriber update ${rowId}: ${upErr.message}`);
        throw new Error('Failed to update subscriber');
      }
    } else {
      const { data: inserted, error: insErr } = await client
        .from('subscribers')
        .insert({
          email: emailNorm,
          name: nameTrim,
          consent: true,
          mailerlite_status: 'pending' satisfies MailerLiteStatus,
        })
        .select('id')
        .single();
      if (insErr || !inserted) {
        const code = (insErr as { code?: string } | null)?.code;
        if (code === '23505') {
          const { data: again } = await client
            .from('subscribers')
            .select('id')
            .eq('email', emailNorm)
            .maybeSingle();
          if (again && typeof (again as { id?: string }).id === 'string') {
            rowId = (again as { id: string }).id;
            await client
              .from('subscribers')
              .update({ name: nameTrim, consent: true, mailerlite_status: 'pending' })
              .eq('id', rowId);
          } else {
            this.logger.warn(`unique race without row for ${emailNorm}`);
            throw new Error('Failed to save subscriber');
          }
        } else {
          this.logger.warn(`subscriber insert: ${insErr?.message ?? 'unknown'}`);
          throw new Error('Failed to save subscriber');
        }
      } else {
        rowId = (inserted as { id: string }).id;
      }
    }

    await this.syncMailerLiteForRow(rowId, emailNorm, nameTrim);
    return { ok: true, id: rowId };
  }

  /** Withdraw marketing consent for account email (profile opt-out). */
  async withdrawMarketingForUser(userId: string): Promise<void> {
    const { data: authData, error: authErr } = await this.supabase
      .getClient()
      .auth.admin.getUserById(userId);
    if (authErr || !authData?.user?.email) {
      return;
    }
    const emailNorm = authData.user.email.trim().toLowerCase();
    const client = this.supabase.getClient();
    await client
      .from('subscribers')
      .update({ consent: false, mailerlite_status: 'synced' })
      .eq('email', emailNorm);
    await this.unsyncMailerLite(emailNorm);
    await this.consentEvents.record(
      userId,
      'marketing_profile',
      false,
      'profile_settings',
    );
  }

  private async unsyncMailerLite(emailNorm: string): Promise<void> {
    const apiKey = this.config.get<string>('MAILERLITE_API_KEY')?.trim();
    if (!apiKey) {
      return;
    }
    try {
      const res = await fetchWithTimeout(MAILERLITE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ email: emailNorm, status: 'unsubscribed' }),
        timeoutMs: 20_000,
        metricsTarget: 'mailerlite',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `MailerLite unsubscribe failed status=${res.status} email=${emailNorm} body=${text.slice(0, 300)}`,
        );
      }
    } catch (err) {
      this.logger.warn(`MailerLite unsubscribe error email=${emailNorm}: ${String(err)}`);
    }
  }

  /** Used by cron to retry rows with mailerlite_status = failed. */
  async retryFailedBatch(limit: number): Promise<number> {
    const client = this.supabase.getClient();
    const { data: rows, error } = await client
      .from('subscribers')
      .select('id, email, name')
      .eq('mailerlite_status', 'failed')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error || !rows?.length) {
      return 0;
    }
    let n = 0;
    for (const r of rows as { id: string; email: string; name: string | null }[]) {
      await this.syncMailerLiteForRow(r.id, r.email, r.name);
      n += 1;
    }
    return n;
  }

  private async syncMailerLiteForRow(
    rowId: string,
    emailNorm: string,
    nameTrim: string | null,
  ): Promise<void> {
    const client = this.supabase.getClient();
    const apiKey = this.config.get<string>('MAILERLITE_API_KEY')?.trim();
    const groupId = this.config.get<string>('MAILERLITE_GROUP_ID')?.trim();

    if (!apiKey) {
      this.logger.warn('MAILERLITE_API_KEY not set; marking subscriber as failed for later retry');
      await client
        .from('subscribers')
        .update({ mailerlite_status: 'failed' satisfies MailerLiteStatus })
        .eq('id', rowId);
      return;
    }

    const body: Record<string, unknown> = {
      email: emailNorm,
      status: 'active',
    };
    if (nameTrim) {
      body.fields = { name: nameTrim };
    }
    if (groupId) {
      body.groups = [groupId];
    }

    try {
      const res = await fetchWithTimeout(MAILERLITE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        timeoutMs: 20_000,
        metricsTarget: 'mailerlite',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `MailerLite POST failed status=${res.status} email=${emailNorm} body=${text.slice(0, 500)}`,
        );
        await client
          .from('subscribers')
          .update({ mailerlite_status: 'failed' satisfies MailerLiteStatus })
          .eq('id', rowId);
        return;
      }
      await client
        .from('subscribers')
        .update({ mailerlite_status: 'synced' satisfies MailerLiteStatus })
        .eq('id', rowId);
    } catch (err) {
      this.logger.warn(`MailerLite request error email=${emailNorm}: ${String(err)}`);
      await client
        .from('subscribers')
        .update({ mailerlite_status: 'failed' satisfies MailerLiteStatus })
        .eq('id', rowId);
    }
  }
}
