import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { AdminOverviewService } from './admin-overview.service';
import type { AdminOverviewDto } from './admin-overview.dto';

@Controller('admin/overview')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireAppRoles('admin')
@RequireAdminScopes('overview')
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get()
  async getOverview(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<AdminOverviewDto> {
    return this.overview.getOverview(user.id);
  }
}
