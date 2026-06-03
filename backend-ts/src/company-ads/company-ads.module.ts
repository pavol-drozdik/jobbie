import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyAdsController } from './company-ads.controller';
import { CompanyAdsListService } from './company-ads-list.service';

@Module({
  imports: [AuthModule, AuditModule, BillingModule],
  controllers: [CompanyAdsController],
  providers: [CompanyAdsListService],
})
export class CompanyAdsModule {}
