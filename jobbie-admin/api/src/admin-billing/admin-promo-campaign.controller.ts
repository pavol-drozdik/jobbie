import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { AdminScopeGuard } from '../auth/admin-scope.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import {
  AdminCreatePromoCampaignDto,
  AdminGeneratePromoCodesDto,
  AdminPatchPoolCodeDto,
  AdminSimulatePromoCampaignDto,
  AdminUpdatePromoCampaignDto,
} from './admin-promo-campaign.dto';
import { AdminPromoCampaignService } from './admin-promo-campaign.service';

@Controller('admin/promo-campaigns')
@RequireAppRoles('admin')
@UseGuards(JwksAuthGuard, AppRoleGuard, AdminScopeGuard)
export class AdminPromoCampaignController {
  constructor(private readonly promos: AdminPromoCampaignService) {}

  @Get('catalog')
  @RequireAdminScopes('billing')
  async catalog() {
    return this.promos.getCatalogOptions();
  }

  @Get()
  @RequireAdminScopes('billing')
  async list(@Query('include_archived') includeArchived?: string) {
    return this.promos.listCampaigns(
      includeArchived === '1' || includeArchived === 'true',
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRecentLogin()
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async create(
    @Body() body: AdminCreatePromoCampaignDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.promos.createCampaign(admin.id, body);
  }

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async simulate(@Body() body: AdminSimulatePromoCampaignDto) {
    return this.promos.simulate(body);
  }

  @Get(':id/redemptions')
  @RequireAdminScopes('billing')
  async listRedemptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.promos.listRedemptions(id, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor || undefined,
    });
  }

  @Post(':id/codes/generate')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async generatePoolCodes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminGeneratePromoCodesDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.promos.generatePoolCodes(admin.id, id, body);
  }

  @Patch(':id/codes/:codeId')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async patchPoolCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('codeId', ParseUUIDPipe) codeId: string,
    @Body() body: AdminPatchPoolCodeDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.promos.patchPoolCode(admin.id, id, codeId, body.status);
  }

  @Get(':id/codes/export')
  @RequireRecentLogin()
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async exportPoolCodes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserDecorator() admin: CurrentUser,
    @Res() res: Response,
  ) {
    const csv = await this.promos.exportPoolCodesCsv(admin.id, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="promo-pool-${id}.csv"`,
    );
    res.send(csv);
  }

  @Get(':id/codes')
  @RequireAdminScopes('billing')
  async listPoolCodes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.promos.listPoolCodes(id, {
      status: status || undefined,
      limit: limit ? Number(limit) : undefined,
      cursor: cursor || undefined,
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminUpdatePromoCampaignDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.promos.updateCampaign(admin.id, id, body);
  }
}
