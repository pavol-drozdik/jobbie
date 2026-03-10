import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { FeedScoringService } from './feed-scoring.service';

@Module({
  imports: [AuthModule],
  controllers: [JobsController],
  providers: [JobsService, FeedScoringService],
  exports: [FeedScoringService],
})
export class JobsModule {}
