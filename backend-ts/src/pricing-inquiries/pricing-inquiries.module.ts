import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { PricingInquiriesController } from './pricing-inquiries.controller';
import { PricingInquiriesService } from './pricing-inquiries.service';

@Module({
  imports: [AuditModule, EmailModule],
  controllers: [PricingInquiriesController],
  providers: [PricingInquiriesService],
})
export class PricingInquiriesModule {}
