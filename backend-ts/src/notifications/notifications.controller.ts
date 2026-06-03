import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import {
  NotificationsListResponseDto,
  NotificationsListQueryDto,
  PushSubscribeDto,
} from './notifications.dto';
import { PushNotificationService } from './push-notification.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('notifications')
@UseGuards(JwksAuthGuard)
export class NotificationsController {
  constructor(
    private notifications: NotificationsService,
    private push: PushNotificationService,
    private supabase: SupabaseService,
  ) {}

  @Get()
  async list(
    @CurrentUserDecorator() user: CurrentUser,
    @Query() query: NotificationsListQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const limit = Math.min(Number(query.limit) || 50, 100);
    const offset = Math.max(Number(query.offset) || 0, 0);
    return this.notifications.listForUser(user.id, limit, offset);
  }

  @Get('push/vapid-public-key')
  getVapidPublicKey(): { publicKey: string | null } {
    return { publicKey: this.push.getPublicVapidKey() };
  }

  @Post('push/subscribe')
  async subscribePush(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: PushSubscribeDto,
  ): Promise<{ ok: true }> {
    const ua = '';
    const { error } = await this.supabase.getClient().from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: ua,
      },
      { onConflict: 'endpoint' },
    );
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { ok: true };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUserDecorator() user: CurrentUser): Promise<{ ok: true }> {
    await this.notifications.markAllReadForUser(user.id);
    return { ok: true };
  }

  @Patch(':id/read')
  async markRead(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ ok: true }> {
    await this.notifications.markRead(user.id, id);
    return { ok: true };
  }
}
