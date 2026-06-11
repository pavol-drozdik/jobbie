import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyAdsController } from './company-ads.controller';
import { CompanyAdsListService } from './company-ads-list.service';
import { SeoModule } from '../seo/seo.module';

@Module({
  imports: [AuthModule, AuditModule, BillingModule, SeoModule],
  controllers: [CompanyAdsController],
  providers: [CompanyAdsListService],
})
export class CompanyAdsModule {}
