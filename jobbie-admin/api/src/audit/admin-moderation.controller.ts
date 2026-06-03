import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { AdminModerationService } from './admin-moderation.service';
import {
  DismissReportDto,
  ModerationActionDto,
  RecordModerationDecisionDto,
} from './admin-moderation.dto';

@Controller('admin/moderation')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireAppRoles('admin')
@RequireAdminScopes('moderation')
export class AdminModerationController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get('pending/banners')
  async listPendingBanners(@Query('limit') limit?: string) {
    return {
      items: await this.moderation.listPendingBanners(Number(limit) || 50),
    };
  }

  @Get('reports/count')
  async countOpenReports(): Promise<{ count: number }> {
    return { count: await this.moderation.countOpenReports() };
  }

  @Get('reports/open')
  async listOpenReports(@Query('limit') limit?: string) {
    return {
      items: await this.moderation.listOpenReports(Number(limit) || 50),
    };
  }

  @Post('decisions')
  @RequireRecentLogin()
  async recordDecision(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: RecordModerationDecisionDto,
  ): Promise<{ ok: boolean }> {
    await this.moderation.recordDecision(user, body);
    return { ok: true };
  }

  @Post('banners/:id/approve')
  @RequireRecentLogin()
  async approveBanner(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: Pick<ModerationActionDto, 'reason'>,
  ) {
    return this.moderation.moderateBanner(user, id, 'approve', body.reason);
  }

  @Post('banners/:id/reject')
  @RequireRecentLogin()
  async rejectBanner(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: Pick<ModerationActionDto, 'reason'>,
  ) {
    return this.moderation.moderateBanner(user, id, 'reject', body.reason);
  }

  @Post('jobs/:id/approve')
  @RequireRecentLogin()
  async approveJob(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: Pick<ModerationActionDto, 'reason'>,
  ) {
    return this.moderation.moderateJob(user, id, 'approve', body.reason);
  }

  @Post('jobs/:id/reject')
  @RequireRecentLogin()
  async rejectJob(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: Pick<ModerationActionDto, 'reason'>,
  ) {
    return this.moderation.moderateJob(user, id, 'reject', body.reason);
  }

  @Post('reports/:id/claim')
  @RequireRecentLogin()
  async claimReport(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') reportId: string,
  ) {
    return this.moderation.claimReport(user, reportId);
  }

  @Post('reports/:id/dismiss')
  @RequireRecentLogin()
  async dismissReport(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') reportId: string,
    @Body() body: DismissReportDto,
  ) {
    return this.moderation.dismissReport(user, reportId, {
      note: body.note,
      resolution_code: body.resolution_code,
    });
  }

  @Post('reports/:id/hide')
  @RequireRecentLogin()
  async hideReportContent(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') reportId: string,
    @Body() body: DismissReportDto,
  ) {
    return this.moderation.hideReportedContent(user, reportId, {
      note: body.note,
      resolution_code: body.resolution_code,
    });
  }
}
