import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { CompanyAdsController } from './company-ads.controller';
import { CompanyAdsListService } from './company-ads-list.service';
import { CompanyAdOpenChatService } from './company-ad-open-chat.service';
import { SeoModule } from '../seo/seo.module';

@Module({
  imports: [AuthModule, AuditModule, BillingModule, ChatModule, SeoModule],
  controllers: [CompanyAdsController],
  providers: [CompanyAdsListService, CompanyAdOpenChatService],
})
export class CompanyAdsModule {}
