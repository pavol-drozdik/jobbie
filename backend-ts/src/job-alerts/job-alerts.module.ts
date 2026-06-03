import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { EmailModule } from '../email/email.module';
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BackgroundQueueModule } from '../queue/background-queue.module';
import { JobAlertsController } from './job-alerts.controller';
import { PublicJobAlertsController } from './public-job-alerts.controller';
import { JobAlertsService } from './job-alerts.service';
import { JobAlertsMatchingService } from './job-alerts-matching.service';
import { JobEmailAlertsCronService } from './job-email-alerts.cron';

@Module({
  imports: [
    AuthModule,
    SupabaseModule,
    EmailModule,
    NotificationsModule,
    BackgroundQueueModule,
    forwardRef(() => SearchModule),
  ],
  controllers: [JobAlertsController, PublicJobAlertsController],
  providers: [
    JobAlertsService,
    JobAlertsMatchingService,
    JobEmailAlertsCronService,
  ],
  exports: [JobAlertsService],
})
export class JobAlertsModule {}
