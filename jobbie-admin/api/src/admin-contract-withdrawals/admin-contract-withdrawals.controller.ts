import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { AdminScopeGuard } from '../auth/admin-scope.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { AdminContractWithdrawalsService } from './admin-contract-withdrawals.service';
import {
  UpdateContractWithdrawalStatusDto,
  type ContractWithdrawalListDto,
  type ContractWithdrawalItemDto,
} from './admin-contract-withdrawals.dto';

@Controller('admin/contract-withdrawals')
@UseGuards(JwksAuthGuard, AppRoleGuard, AdminScopeGuard)
@RequireAppRoles('admin')
@RequireAdminScopes('support')
export class AdminContractWithdrawalsController {
  constructor(private readonly withdrawals: AdminContractWithdrawalsService) {}

  @Get('export')
  @RequireRecentLogin()
  async exportRows(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
  ): Promise<void> {
    const fmt = format === 'json' ? 'json' : 'csv';
    const exported = await this.withdrawals.exportRows(
      { status, q, from, to },
      fmt,
    );
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    );
    res.send(exported.body);
  }

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ): Promise<ContractWithdrawalListDto> {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    return this.withdrawals.list({
      status,
      q,
      from,
      to,
      limit,
      cursor,
    });
  }

  @Patch(':id')
  @RequireRecentLogin()
  async updateStatus(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: UpdateContractWithdrawalStatusDto,
  ): Promise<ContractWithdrawalItemDto> {
    return this.withdrawals.updateStatus(user, id, body.status);
  }
}
