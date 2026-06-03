import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import {
  CreateJobEmailAlertDto,
  JobAlertPreviewCriteriaDto,
  JobEmailAlertResponseDto,
  UpdateJobEmailAlertDto,
} from './job-alerts.dto';
import { JobAlertsService } from './job-alerts.service';

@Controller('job-alerts')
@UseGuards(JwksAuthGuard)
export class JobAlertsController {
  constructor(private readonly jobAlerts: JobAlertsService) {}

  @Get()
  async list(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<JobEmailAlertResponseDto[]> {
    await this.jobAlerts.assertJobSeeker(user.id);
    return this.jobAlerts.listForUser(user.id);
  }

  @Post('preview-count')
  async previewCount(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: JobAlertPreviewCriteriaDto,
  ): Promise<{ found: number }> {
    return this.jobAlerts.previewCriteriaCount(user.id, body);
  }

  @Post()
  async create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreateJobEmailAlertDto,
  ): Promise<JobEmailAlertResponseDto> {
    return this.jobAlerts.create(user.id, body);
  }

  @Patch(':id')
  async update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: UpdateJobEmailAlertDto,
  ): Promise<JobEmailAlertResponseDto> {
    return this.jobAlerts.update(user.id, id, body);
  }

  @Delete(':id')
  async remove(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<{ ok: boolean }> {
    return this.jobAlerts.remove(user.id, id);
  }
}
