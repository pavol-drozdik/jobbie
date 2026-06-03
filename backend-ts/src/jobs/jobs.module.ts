import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { JobsController } from './jobs.controller';
import { JobsFeedGateway } from './jobs-feed.gateway';
import { FeedScoringService } from './feed-scoring.service';
import { SearchModule } from '../search/search.module';
import { JobListingExpiryCron } from './job-listing-expiry.cron';

@Module({
  imports: [AuthModule, SearchModule, AuditModule, BillingModule],
  controllers: [JobsController],
  providers: [FeedScoringService, JobsFeedGateway, JobListingExpiryCron],
  exports: [FeedScoringService],
})
export class JobsModule {}
