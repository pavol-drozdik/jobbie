import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditModule } from '../audit/audit.module';

import { AuthModule } from '../auth/auth.module';

import { PaymentsModule } from '../payments/payments.module';

import { BillingController } from './billing.controller';
import { RegistrationPromoController } from './registration-promo.controller';
import { RegistrationPromoService } from './registration-promo.service';

import { BillingCatalogService } from './billing-catalog.service';
import { BillingPurchaseAuthorizationService } from './billing-purchase-authorization.service';
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

  controllers: [BillingController, RegistrationPromoController],

  providers: [

    CreditsService,

    SubscriptionLimitsService,

    ListingTopPromotionService,

    BillingCatalogService,

    BillingPurchaseAuthorizationService,

    CvDatabaseQuotaService,

    SubscriptionTrialService,

    RegistrationPromoService,

  ],

  exports: [

    CreditsService,

    SubscriptionLimitsService,

    ListingTopPromotionService,

    BillingCatalogService,

    BillingPurchaseAuthorizationService,

    CvDatabaseQuotaService,

    SubscriptionTrialService,

  ],

})

export class BillingModule {}
