import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { ContentReportsService } from './content-reports.service';
import { CreateContentReportDto } from './content-reports.dto';

@Controller('reports')
@UseGuards(JwksAuthGuard)
export class ContentReportsController {
  constructor(private readonly reports: ContentReportsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreateContentReportDto,
  ) {
    return this.reports.createReport(user.id, body);
  }
}
