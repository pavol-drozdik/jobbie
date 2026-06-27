import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditModule } from '../audit/audit.module';

import { AuthModule } from '../auth/auth.module';

import { PaymentsModule } from '../payments/payments.module';

import { BillingController } from './billing.controller';

import { BillingCatalogService } from './billing-catalog.service';

import { CreditsService } from './credits.service';

import { CvDatabaseQuotaService } from './cv-database-quota.service';

import { SubscriptionLimitsService } from './subscription-limits.service';

import { ListingTopPromotionService } from './listing-top-promotion.service';

import { SubscriptionTrialService } from './subscription-trial.service';

@Module({

  imports: [
    ConfigModule,
    AuditModule,
    AuthModule,
    forwardRef(() => PaymentsModule),
  ],

  controllers: [BillingController],

  providers: [

    CreditsService,

    SubscriptionLimitsService,

    ListingTopPromotionService,

    BillingCatalogService,

    CvDatabaseQuotaService,

    SubscriptionTrialService,

  ],

  exports: [

    CreditsService,

    SubscriptionLimitsService,

    ListingTopPromotionService,

    BillingCatalogService,

    CvDatabaseQuotaService,

    SubscriptionTrialService,

  ],

})

export class BillingModule {}
