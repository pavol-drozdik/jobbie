import { Injectable, Logger, Optional } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import { BACKGROUND_QUEUE_NAME } from '../queue/background-queue.module'
import { CvPdfGenerationService } from './cv-pdf-generation.service'

const JOB_NAME = 'cv-regenerate-pdf'
export const CV_PDF_DEBOUNCE_MS = 45_000

export type CvRegeneratePdfJobPayload = {
  cvId: string
  userId: string
}

@Injectable()
export class CvPdfQueueService {
  private readonly logger = new Logger(CvPdfQueueService.name)
  /** In-process debounce when BullMQ is unavailable (local dev without Redis). */
  private readonly inlineDebounceTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    @Optional() @InjectQueue(BACKGROUND_QUEUE_NAME) private readonly backgroundQueue?: Queue,
    private readonly cvPdfGeneration?: CvPdfGenerationService,
  ) {}

  /** Debounced background PDF regeneration after CV saves. */
  scheduleRegeneration(cvId: string, userId: string): void {
    const trimmedCvId = cvId.trim()
    const trimmedUserId = userId.trim()
    if (!trimmedCvId || !trimmedUserId) {
      return
    }
    if (!this.backgroundQueue) {
      this.scheduleInlineDebounced(trimmedCvId, trimmedUserId)
      return
    }
    void this.backgroundQueue
      .add(
        JOB_NAME,
        { cvId: trimmedCvId, userId: trimmedUserId } satisfies CvRegeneratePdfJobPayload,
        {
          jobId: `cv-pdf:${trimmedCvId}`,
          delay: CV_PDF_DEBOUNCE_MS,
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
        },
      )
      .catch((err: unknown) => {
        this.logger.warn(`cv-pdf enqueue failed for ${trimmedCvId}: ${String(err)}`)
      })
  }

  private scheduleInlineDebounced(cvId: string, userId: string): void {
    const isNewWindow = !this.inlineDebounceTimers.has(cvId)
    const existing = this.inlineDebounceTimers.get(cvId)
    if (existing) {
      clearTimeout(existing)
    }
    const timer = setTimeout(() => {
      this.inlineDebounceTimers.delete(cvId)
      if (!this.cvPdfGeneration) {
        this.logger.warn(`cv-pdf inline: generation service unavailable for cv=${cvId}`)
        return
      }
      void this.cvPdfGeneration.generateAndStore(cvId, userId).catch((err: unknown) => {
        this.logger.warn(`cv-pdf inline generation failed for ${cvId}: ${String(err)}`)
      })
    }, CV_PDF_DEBOUNCE_MS)
    this.inlineDebounceTimers.set(cvId, timer)
    if (isNewWindow) {
      this.logger.debug(
        `cv-pdf inline debounce (no Redis, ${CV_PDF_DEBOUNCE_MS}ms): cv=${cvId}`,
      )
    }
  }

  isQueueAvailable(): boolean {
    return Boolean(this.backgroundQueue)
  }
}

export { JOB_NAME as CV_REGENERATE_PDF_JOB_NAME }
