import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { OptionalAuth } from '../auth/optional-auth.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { CookieConsentLogService } from './cookie-consent-log.service';
import { RecordCookieConsentDto } from './cookie-consent-log.dto';

@Controller('consent')
@Public()
export class CookieConsentController {
  constructor(private readonly cookieConsentLog: CookieConsentLogService) {}

  @Post('cookie')
  @OptionalAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async recordCookieConsent(
    @Body() body: RecordCookieConsentDto,
    @CurrentUserDecorator() user: CurrentUser | null,
    @Req() req: Request,
  ): Promise<void> {
    await this.cookieConsentLog.record(body, user?.id ?? null, req);
  }
}
