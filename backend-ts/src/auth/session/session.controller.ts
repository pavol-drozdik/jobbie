import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../public.decorator';
import { CreateSessionDto, StepUpSessionDto } from './session.dto';
import { SessionService } from './session.service';
import { SessionAuthGuard } from '../session-auth.guard';
import { UseGuards } from '@nestjs/common';

function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',')[0]?.trim() ?? null;
  }
  return req.socket?.remoteAddress ?? null;
}

@Controller('auth/session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async create(
    @Body() body: CreateSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const headerUa =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null;
    return this.sessions.establishSession(res, {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      deviceId: body.device_id,
      userAgent: body.user_agent?.trim() || headerUa || undefined,
      ip: clientIp(req),
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.sessions.refreshSession(req, res);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.sessions.logout(req, res);
  }

  @Post('step-up')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async stepUp(@Body() body: StepUpSessionDto, @Req() req: Request) {
    return this.sessions.stepUp(req, body.access_token);
  }
}
