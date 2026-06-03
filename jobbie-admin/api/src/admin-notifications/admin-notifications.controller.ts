import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import {
  AdminBroadcastDto,
  BroadcastAudienceQueryDto,
} from './admin-notifications.dto';
import { AdminNotificationsService } from './admin-notifications.service';

@Controller('admin/notifications')
@RequireAppRoles('admin')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireRecentLogin()
export class AdminNotificationsController {
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Get('broadcast/count')
  async countRecipients(@Query() query: BroadcastAudienceQueryDto) {
    const count = await this.notifications.countRecipients(
      query.audience ?? 'all',
    );
    return { count, audience: query.audience ?? 'all' };
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async broadcast(
    @CurrentUserDecorator() admin: CurrentUser,
    @Body() body: AdminBroadcastDto,
  ): Promise<{ sent: number; broadcast_id: string }> {
    return this.notifications.broadcastToAllUsers(admin, body);
  }
}
