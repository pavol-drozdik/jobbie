import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SkRpoLookupService } from '../registry/sk-rpo-lookup.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { SubscriptionCreditsService } from './subscription-credits.service';
import { SubscriptionMonthlyCreditsCron } from './subscription-monthly-credits.cron';

@Module({
  imports: [AuthModule, AuditModule, forwardRef(() => BillingModule), NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    StripeService,
    SkRpoLookupService,
    SubscriptionCreditsService,
    SubscriptionMonthlyCreditsCron,
  ],
  exports: [StripeService],
})
export class PaymentsModule {}
