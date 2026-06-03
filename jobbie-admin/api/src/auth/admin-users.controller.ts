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
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { AdminBillingService } from '../admin-billing/admin-billing.service';
import { AdminDataExportService } from '../admin-data-export/admin-data-export.service';
import { AdminAccountCloseService } from '../admin-account/admin-account-close.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwksAuthGuard } from './jwks-auth.guard';
import { AppRoleGuard } from './app-role.guard';
import { RequireAppRoles } from './app-roles.decorator';
import { RequireAdminScopes } from './admin-scope.decorator';
import { AdminScopeGuard } from './admin-scope.guard';
import { CurrentUserDecorator } from './current-user.decorator';
import type { CurrentUser } from './auth.types';
import { RequireRecentLogin } from './require-recent-login.decorator';
import { AdminUsersService } from './admin-users.service';
import {
  AdminUserSearchQueryDto,
  CloseAccountDto,
  GrantCreditsDto,
} from './admin-users.dto';

class SuspendUserDto {
  reason?: string;
}

@Controller('admin/users')
@RequireAppRoles('admin')
@UseGuards(JwksAuthGuard, AppRoleGuard, AdminScopeGuard)
export class AdminUsersController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly users: AdminUsersService,
    private readonly billing: AdminBillingService,
    private readonly dataExport: AdminDataExportService,
    private readonly accountClose: AdminAccountCloseService,
  ) {}

  @Get('search')
  @RequireAdminScopes('users', 'support')
  async search(@Query() query: AdminUserSearchQueryDto) {
    const limit = query.limit ?? 20;
    const items = await this.users.searchUsers(query.q?.trim() ?? '', limit);
    return { items };
  }

  @Get(':id')
  @RequireAdminScopes('users', 'support')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getUserDetail(id);
  }

  @Get(':id/billing')
  @RequireAdminScopes('users', 'billing')
  async getBilling(@Param('id', ParseUUIDPipe) id: string) {
    const [ledger, stripe] = await Promise.all([
      this.billing.listLedger(id, 50),
      this.billing.listStripeFulfillmentGaps(id),
    ]);
    return { ledger, stripe };
  }

  @Post(':id/grant-credits')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('billing')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async grantCredits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GrantCreditsDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.billing.grantCredits(admin.id, id, body.amount, body.reason);
  }

  @Post(':id/export-data')
  @RequireRecentLogin()
  @RequireAdminScopes('users')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async exportData(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserDecorator() admin: CurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const zip = await this.dataExport.buildExportZip(id);
    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.user.data_exported',
      subjectType: 'profile',
      subjectId: id,
      payload: {},
    });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="jobbie-export-${id}.zip"`,
    );
    return new StreamableFile(zip);
  }

  @Post(':id/close-account')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('users')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async closeAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseAccountDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    return this.accountClose.closeAccount(id, admin.id, body.confirm_phrase);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('users')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuspendUserDto,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    const client = this.supabase.getClient();
    const { error } = await client
      .from('profiles')
      .update({
        account_status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: body.reason?.trim() || null,
        suspended_by: admin.id,
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    await client.auth.admin.updateUserById(id, {
      ban_duration: '876000h',
    });

    await client
      .from('api_user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', id)
      .is('revoked_at', null);

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'account.suspended',
      subjectType: 'profile',
      subjectId: id,
      payload: { reason: body.reason ?? null },
    });

    return { ok: true };
  }

  @Post(':id/unsuspend')
  @HttpCode(HttpStatus.OK)
  @RequireRecentLogin()
  @RequireAdminScopes('users')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async unsuspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserDecorator() admin: CurrentUser,
  ) {
    const client = this.supabase.getClient();
    const { error } = await client
      .from('profiles')
      .update({
        account_status: 'active',
        suspended_at: null,
        suspended_reason: null,
        suspended_by: null,
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    await client.auth.admin.updateUserById(id, { ban_duration: 'none' });

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'account.unsuspended',
      subjectType: 'profile',
      subjectId: id,
      payload: {},
    });

    return { ok: true };
  }
}
