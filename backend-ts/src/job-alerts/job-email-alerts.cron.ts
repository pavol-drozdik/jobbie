import { Injectable, Optional, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { JobAlertsService } from './job-alerts.service';

/** Transactional job-alert digests — enqueue when Redis available; include pause/unsubscribe in email body. */
@Injectable()
export class JobEmailAlertsCronService {
  constructor(
    private readonly jobAlerts: JobAlertsService,
    @Optional() @InjectQueue('background') private readonly backgroundQueue?: Queue,
  ) {}

  @Cron('*/15 * * * *')
  async tick(): Promise<void> {
    if (!this.jobAlerts.canRunDispatch()) {
      return;
    }
    if (this.backgroundQueue) {
      const tickBucket = Math.floor(Date.now() / (15 * 60 * 1000));
      await this.backgroundQueue.add(
        'job-email-alerts',
        {},
        {
          jobId: `job-email-alerts:${tickBucket}`,
          removeOnComplete: 80,
          attempts: 3,
          backoff: { type: 'exponential', delay: 4000 },
        },
      );
      return;
    }
    await this.jobAlerts.dispatchAllDueAlerts();
  }
}
