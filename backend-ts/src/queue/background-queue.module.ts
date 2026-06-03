import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { isRedisUrlConfigured } from '../search/search-imports';

export const BACKGROUND_QUEUE_NAME = 'background';

const redisQueue = isRedisUrlConfigured();

@Module({
  imports: [
    ...(redisQueue
      ? [BullModule.registerQueue({ name: BACKGROUND_QUEUE_NAME })]
      : []),
  ],
  exports: [...(redisQueue ? [BullModule] : [])],
})
export class BackgroundQueueModule {}
