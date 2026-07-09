import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { AdminScopeGuard } from '../auth/admin-scope.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { AdminRegistrationPromoService } from './admin-registration-promo.service';
import { AdminUpdateRegistrationPromoCampaignDto } from './admin-registration-promo.dto';

@Controller('admin/registration-promo')
@RequireAppRoles('admin')
@UseGuards(JwksAuthGuard, AppRoleGuard, AdminScopeGuard)
export class AdminRegistrationPromoController {
  constructor(private readonly promos: AdminRegistrationPromoService) {}

  @Get('campaigns')
  @RequireAdminScopes('billing')
  async listCampaigns() {
    return this.promos.listCampaigns();
  }

  @Patch('campaigns/:id')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async updateCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminUpdateRegistrationPromoCampaignDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.promos.updateCampaign(admin.id, id, body);
  }
}
