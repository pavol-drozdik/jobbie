import { Injectable, Optional, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { SearchAlertsService } from './search-alerts.service';

/**
 * Dispatches saved-search emails on a schedule: BullMQ when Redis is enabled,
 * otherwise inline processing.
 */
@Injectable()
export class SearchAlertsCronService {
  constructor(
    private readonly alerts: SearchAlertsService,
    @Optional() @InjectQueue('background') private readonly backgroundQueue?: Queue,
  ) {}

  @Cron('*/15 * * * *')
  async tick(): Promise<void> {
    if (!this.alerts.canRunAlerts()) {
      return;
    }
    if (this.backgroundQueue) {
      const tickBucket = Math.floor(Date.now() / (15 * 60 * 1000));
      await this.backgroundQueue.add(
        'search-alerts',
        {},
        {
          jobId: `search-alerts:${tickBucket}`,
          removeOnComplete: 80,
          attempts: 3,
          backoff: { type: 'exponential', delay: 4000 },
        },
      );
      return;
    }
    await this.alerts.dispatchSavedSearchAlerts();
  }
}
