import { Global, Module } from '@nestjs/common';
import { ConsentEventsService } from './consent-events.service';
import { CookieConsentLogService } from './cookie-consent-log.service';
import { CookieConsentController } from './cookie-consent.controller';

@Global()
@Module({
  controllers: [CookieConsentController],
  providers: [ConsentEventsService, CookieConsentLogService],
  exports: [ConsentEventsService, CookieConsentLogService],
})
export class ConsentModule {}
