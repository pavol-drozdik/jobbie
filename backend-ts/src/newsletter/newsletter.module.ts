import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { MailerLiteRetryCron } from './mailerlite-retry.cron';
@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService, MailerLiteRetryCron],
  exports: [NewsletterService],
})
export class NewsletterModule {}
