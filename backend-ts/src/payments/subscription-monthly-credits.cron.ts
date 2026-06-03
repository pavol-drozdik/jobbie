import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionCreditsService } from './subscription-credits.service';

@Injectable()
export class SubscriptionMonthlyCreditsCron {
  private readonly logger = new Logger(SubscriptionMonthlyCreditsCron.name);

  constructor(
    private readonly subscriptionCredits: SubscriptionCreditsService,
  ) {}

  /**
   * First day of month (UTC): grant free-plan monthly credits once per user per YYYY-MM.
   * NOTE: Paid plan grants come from Stripe invoice webhooks, not this cron.
   */
  @Cron('15 6 1 * *')
  async runMonthlyFreeCredits(): Promise<void> {
    const period = new Date().toISOString().slice(0, 7);
    this.logger.log(`runMonthlyFreeCredits: period=${period}`);
    try {
      await this.subscriptionCredits.runFreeMonthlyGrants(period);
    } catch (err) {
      this.logger.error(
        `runMonthlyFreeCredits failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
