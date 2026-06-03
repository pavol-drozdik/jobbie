import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { ClientEventsIngestDto } from './client-events.dto';

function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',')[0]?.trim() ?? null;
  }
  const a = req.socket?.remoteAddress;
  return a ?? null;
}

@Controller('analytics')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class ClientTelemetryController {
  constructor(private readonly supabase: SupabaseService) {}

  @Post('client-events')
  @UseGuards(JwksAuthGuard)
  async ingestBatch(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ClientEventsIngestDto,
    @Req() req: Request,
  ): Promise<{ ok: boolean }> {
    const events = body.events ?? [];
    if (events.length === 0) {
      return { ok: true };
    }
    const ua =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null;
    await this.supabase.getClient().from('client_event_batches').insert({
      user_id: user.id,
      events,
      ip: clientIp(req),
      user_agent: ua,
    });
    return { ok: true };
  }

  @Post('storage-access')
  @UseGuards(JwksAuthGuard)
  async logStorageAccess(
    @CurrentUserDecorator() user: CurrentUser,
    @Body()
    body: {
      bucket_id: string;
      object_path: string;
      action: 'upload' | 'download';
      bytes?: number;
    },
  ): Promise<{ ok: boolean }> {
    if (!body?.bucket_id?.trim() || !body?.object_path?.trim()) {
      return { ok: true };
    }
    const action = body.action === 'upload' ? 'upload' : 'download';
    await this.supabase.getClient().from('storage_access_events').insert({
      bucket_id: body.bucket_id.trim(),
      object_path: body.object_path.trim(),
      action,
      bytes: body.bytes ?? null,
      owner_id: user.id,
    });
    return { ok: true };
  }
}
