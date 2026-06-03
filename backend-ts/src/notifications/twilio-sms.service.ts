import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';

@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);

  /** Per-recipient send timestamps for coarse rate limiting. */
  private readonly recentSends = new Map<string, number[]>();

  constructor(private config: ConfigService) {}

  private assertRateLimit(toE164: string): void {
    const now = Date.now();
    const key = toE164.trim();
    const windowMs = 60_000;
    const maxPerMinute = 3;
    const maxPerDay = 10;
    const prev = this.recentSends.get(key) ?? [];
    const inWindow = prev.filter((t) => now - t < windowMs);
    const inDay = prev.filter((t) => now - t < 86_400_000);
    if (inWindow.length >= maxPerMinute || inDay.length >= maxPerDay) {
      throw new Error('SMS rate limit exceeded');
    }
    this.recentSends.set(key, [...inDay, now]);
  }

  async sendSms(toE164: string, body: string): Promise<boolean> {
    try {
      this.assertRateLimit(toE164);
    } catch {
      this.logger.warn(`SMS rate limit for ${toE164}`);
      return false;
    }
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    const from = this.config.get<string>('TWILIO_FROM_NUMBER')?.trim();
    if (!sid || !token || !from) {
      this.logger.debug('Twilio not configured; skip SMS');
      return false;
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const params = new URLSearchParams({ To: toE164, From: from, Body: body.slice(0, 1400) });
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      timeoutMs: 15_000,
      metricsTarget: 'twilio',
    });
    if (!res.ok) {
      const t = await res.text();
      this.logger.warn(`Twilio SMS failed: ${res.status} ${t}`);
      return false;
    }
    return true;
  }
}
