import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { BackgroundQueueModule } from '../queue/background-queue.module';
import { NotificationsController } from './notifications.controller';
import { PublicNotificationPreferencesController } from './public-notification-preferences.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { PreferenceTokenService } from './preference-token.service';
import { NotificationJobsService } from './notification-jobs.service';

@Module({
  imports: [forwardRef(() => AuthModule), EmailModule, BackgroundQueueModule],
  controllers: [
    NotificationsController,
    PublicNotificationPreferencesController,
  ],
  providers: [
    NotificationsService,
    PushNotificationService,
    PreferenceTokenService,
    NotificationJobsService,
  ],
  exports: [NotificationsService, PreferenceTokenService, NotificationJobsService],
})
export class NotificationsModule {}
