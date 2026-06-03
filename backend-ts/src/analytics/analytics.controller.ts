import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import {
  CustomerDashboardDto,
  JobStatsResponseDto,
  ProfileViewBodyDto,
  ProviderDashboardDto,
} from './analytics.dto';
import { AnalyticsService } from './analytics.service';

@Controller()
@UseGuards(JwksAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard/customer')
  async getCustomerDashboard(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<CustomerDashboardDto> {
    return this.analytics.getCustomerDashboard(user.id, from, to);
  }

  @Get('dashboard/customer/job/:jobId')
  async getJobStats(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<JobStatsResponseDto> {
    return this.analytics.getJobStats(user.id, jobId, from, to);
  }

  @Get('dashboard/provider')
  async getProviderDashboard(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ProviderDashboardDto> {
    return this.analytics.getProviderDashboard(user.id, from, to);
  }

  @Post('analytics/profile-view')
  async recordProfileView(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ProfileViewBodyDto,
  ): Promise<{ ok: boolean }> {
    if (body.viewedProfileId === user.id) {
      throw new BadRequestException('Cannot record view of own profile');
    }
    await this.analytics.recordProfileView(user.id, body.viewedProfileId);
    return { ok: true };
  }
}
