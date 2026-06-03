import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CreditsService } from './credits.service';

@Injectable()
export class CreditExpirationCron {
  private readonly logger = new Logger(CreditExpirationCron.name);

  constructor(private readonly credits: CreditsService) {}

  /** Daily at 05:30 UTC — expire_due_credit_lots RPC only; never inline from user requests. */
  @Cron('30 5 * * *')
  async runExpiration(): Promise<void> {
    try {
      const n = await this.credits.expireDueLots();
      if (n > 0) {
        this.logger.log(`Expired ${n} credit lot(s)`);
      }
    } catch (err) {
      this.logger.warn(`Credit expiration cron failed: ${String(err)}`);
    }
  }
}
