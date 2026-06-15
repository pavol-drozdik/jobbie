import { Module } from '@nestjs/common';
import { AdminConsentCookieLogController } from './admin-consent-cookie-log.controller';

@Module({
  controllers: [AdminConsentCookieLogController],
})
export class AdminConsentModule {}
