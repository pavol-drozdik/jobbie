import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import type { Job } from 'bullmq';
import { bullJobDurationSeconds } from '../observability/metrics';
import { NotificationJobsService } from '../notifications/notification-jobs.service';
import { StorageUploadService } from '../storage/storage-upload.service';
import { SearchAlertsService } from './search-alerts.service';
import { SearchIndexingService } from './search-indexing.service';
import { JobAlertsService } from '../job-alerts/job-alerts.service';
import { BACKGROUND_QUEUE_NAME } from '../queue/background-queue.module';
import {
  CV_REGENERATE_PDF_JOB_NAME,
  type CvRegeneratePdfJobPayload,
} from '../cv/cv-pdf-queue.service';
import { CvPdfGenerationService } from '../cv/cv-pdf-generation.service';

function parseWorkerConcurrency(): number {
  const raw = process.env.BULL_WORKER_CONCURRENCY;
  const n = raw === undefined || raw === '' ? 4 : Number(raw);
  return Math.min(Math.max(Number.isFinite(n) ? n : 4, 1), 16);
}

/**
 * Background worker for durable jobs (email alerts, storage finalize, digests).
 * Requires `REDIS_URL` and Bull registration via BackgroundQueueModule.
 * NOTE: Never queue credit grants or Stripe fulfillment.
 */
@Processor(BACKGROUND_QUEUE_NAME, {
  concurrency: parseWorkerConcurrency(),
})
export class BackgroundJobsConsumer extends WorkerHost {
  private readonly logger = new Logger(BackgroundJobsConsumer.name);

  constructor(
    private readonly searchAlerts: SearchAlertsService,
    private readonly searchIndexing: SearchIndexingService,
    @Inject(forwardRef(() => JobAlertsService))
    private readonly jobAlerts: JobAlertsService,
    private readonly notificationJobs: NotificationJobsService,
    private readonly storageUpload: StorageUploadService,
    private readonly cvPdfGeneration: CvPdfGenerationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const started = Date.now();
    try {
      switch (job.name) {
        case 'search-alerts':
          await this.searchAlerts.dispatchSavedSearchAlerts();
          return;
        case 'job-email-alerts':
          await this.jobAlerts.dispatchAllDueAlerts();
          return;
        case 'weekly-digest':
          await this.notificationJobs.runWeeklyDigest();
          return;
        case 'reengagement':
          await this.notificationJobs.runReengagement();
          return;
        case 'storage-finalize':
          await this.storageUpload.processFinalizeJob(
            String(job.data?.uploadId ?? ''),
            String(job.data?.userId ?? ''),
          );
          return;
        case 'typesense-reindex-chunk': {
          const offset = Number(job.data?.offset ?? 0);
          const limit = Math.min(Number(job.data?.limit ?? 100), 200);
          await this.searchIndexing.reindexJobsChunk(offset, limit);
          return;
        }
        case CV_REGENERATE_PDF_JOB_NAME: {
          const payload = job.data as CvRegeneratePdfJobPayload;
          const cvId = String(payload?.cvId ?? '').trim();
          const userId = String(payload?.userId ?? '').trim();
          if (!cvId || !userId) {
            this.logger.warn('cv-regenerate-pdf missing cvId or userId');
            return;
          }
          await this.cvPdfGeneration.generateAndStore(cvId, userId);
          return;
        }
        case 'reports':
          this.logger.log('Queued "reports" job — handler not implemented.');
          return;
        case 'exports':
          this.logger.log('Queued "exports" job — handler not implemented.');
          return;
        default:
          this.logger.warn(`Unknown background job name: ${job.name}`);
      }
    } finally {
      bullJobDurationSeconds.observe(
        { job_name: job.name },
        (Date.now() - started) / 1000,
      );
    }
  }
}
