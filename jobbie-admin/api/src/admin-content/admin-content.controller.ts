import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { AdminContentService } from './admin-content.service';
import { AdminApplicationsQueryDto } from './admin-content.dto';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';

@Controller('admin')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireAppRoles('admin')
@RequireAdminScopes('support')
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  @Get('jobs/:id')
  async getJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getJob(id);
  }

  @Post('jobs/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  async unpublishJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.content.unpublishJob(admin, id);
  }

  @Get('company-ads/:id')
  async getCompanyAd(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getCompanyAd(id);
  }

  @Post('company-ads/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  async unpublishCompanyAd(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.content.unpublishCompanyAd(admin, id);
  }

  @Get('applications')
  async listApplications(@Query() query: AdminApplicationsQueryDto) {
    return this.content.listApplications({
      jobId: query.job_id,
      userId: query.user_id,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get('chat/rooms')
  async listChatRooms(
    @Query('user_id', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.content.listChatRooms(userId, Number(limit) || 50);
  }
}
