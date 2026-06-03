import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolvePublicAppOrigin } from '../common/public-urls.util';
import { JobAlertsService } from './job-alerts.service';
import { Public } from '../auth/public.decorator';

@Controller('public/job-alerts')
@Public()
export class PublicJobAlertsController {
  constructor(
    private readonly jobAlerts: JobAlertsService,
    private readonly config: ConfigService,
  ) {}

  @Get('pause')
  async pause(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const appOrigin = resolvePublicAppOrigin(this.config);
    const successUrl = `${appOrigin}/ponuky-na-email/pozastavene`;
    const failureUrl = `${successUrl}?error=invalid`;
    try {
      if (!token?.trim()) {
        res.redirect(302, failureUrl);
        return;
      }
      await this.jobAlerts.pauseAlertFromToken(token);
      res.redirect(302, successUrl);
    } catch {
      res.redirect(302, failureUrl);
    }
  }
}
