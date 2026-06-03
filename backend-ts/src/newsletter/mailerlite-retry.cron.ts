import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { NewsletterService } from './newsletter.service';

/**
 * Retries MailerLite sync for rows stuck in `failed` (e.g. transient API outage or missing API key at signup).
 */
@Injectable()
export class MailerLiteRetryCron {
  private readonly logger = new Logger(MailerLiteRetryCron.name);

  constructor(
    private readonly newsletter: NewsletterService,
    private readonly config: ConfigService,
  ) {}

  @Cron('25 */2 * * *')
  async retryFailedSubscribers(): Promise<void> {
    if (!this.config.get<string>('MAILERLITE_API_KEY')?.trim()) {
      return;
    }
    const n = await this.newsletter.retryFailedBatch(50);
    if (n > 0) {
      this.logger.log(`MailerLite retry cron processed ${n} subscriber row(s).`);
    }
  }
}
