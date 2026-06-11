import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { JobsController } from './jobs.controller';
import { JobsFeedGateway } from './jobs-feed.gateway';
import { FeedScoringService } from './feed-scoring.service';
import { SearchModule } from '../search/search.module';
import { SeoModule } from '../seo/seo.module';
import { JobListingExpiryCron } from './job-listing-expiry.cron';

@Module({
  imports: [AuthModule, ProfilesModule, SearchModule, AuditModule, BillingModule, SeoModule],
  controllers: [JobsController],
  providers: [FeedScoringService, JobsFeedGateway, JobListingExpiryCron],
  exports: [FeedScoringService],
})
export class JobsModule {}
