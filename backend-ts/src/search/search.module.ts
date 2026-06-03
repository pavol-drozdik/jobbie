import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { BackgroundQueueModule } from '../queue/background-queue.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { TypesenseService } from './typesense.service';
import { SearchIndexingService } from './search-indexing.service';
import { SearchAlertsService } from './search-alerts.service';
import { SearchAlertsCronService } from './search-alerts.cron';
import { BackgroundJobsConsumer } from './background-jobs.consumer';
import { isRedisUrlConfigured } from './search-imports';
import { JobAlertsModule } from '../job-alerts/job-alerts.module';
import { CvModule } from '../cv/cv.module';
import { BillingModule } from '../billing/billing.module';

const redisQueue = isRedisUrlConfigured();

@Module({
  imports: [
    AuthModule,
    EmailModule,
    NotificationsModule,
    StorageModule,
    BackgroundQueueModule,
    forwardRef(() => JobAlertsModule),
    forwardRef(() => CvModule),
    BillingModule,
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    TypesenseService,
    SearchIndexingService,
    SearchAlertsService,
    SearchAlertsCronService,
    ...(redisQueue ? [BackgroundJobsConsumer] : []),
  ],
  exports: [SearchService, TypesenseService, SearchIndexingService],
})
export class SearchModule {}
