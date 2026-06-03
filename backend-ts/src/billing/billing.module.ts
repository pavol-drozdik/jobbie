import { Module, forwardRef } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';

import { AuthModule } from '../auth/auth.module';

import { PaymentsModule } from '../payments/payments.module';

import { BillingController } from './billing.controller';

import { BillingCatalogService } from './billing-catalog.service';

import { CreditsService } from './credits.service';

import { CvDatabaseQuotaService } from './cv-database-quota.service';

import { SubscriptionLimitsService } from './subscription-limits.service';

import { PaidPlanAccessService } from './paid-plan-access.service';

import { ListingTopPromotionService } from './listing-top-promotion.service';

import { CreditExpirationCron } from './credit-expiration.cron';



@Module({

  imports: [AuditModule, AuthModule, forwardRef(() => PaymentsModule)],

  controllers: [BillingController],

  providers: [

    CreditsService,

    SubscriptionLimitsService,

    PaidPlanAccessService,

    ListingTopPromotionService,

    BillingCatalogService,

    CvDatabaseQuotaService,

    CreditExpirationCron,

  ],

  exports: [

    CreditsService,

    SubscriptionLimitsService,

    PaidPlanAccessService,

    ListingTopPromotionService,

    BillingCatalogService,

    CvDatabaseQuotaService,

  ],

})

export class BillingModule {}

