import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import {
  adminRecentLoginSecondsFromMinutes,
  parseAdminRecentLoginMinutes,
} from './admin-recent-login.config';
import { REQUIRE_RECENT_LOGIN_KEY } from './require-recent-login.decorator';

/**
 * Desktop admin API: step-up via JWT auth_time / iat (no BFF session cookies).
 * Window: ADMIN_RECENT_LOGIN_MINUTES (default 120 for local admin).
 */
@Injectable()
export class BearerRecentLoginGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  private recentLoginSeconds(): number {
    const minutes = parseAdminRecentLoginMinutes(
      this.config.get<string>('ADMIN_RECENT_LOGIN_MINUTES'),
    );
    return adminRecentLoginSecondsFromMinutes(minutes);
  }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_RECENT_LOGIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers.authorization;
    const token =
      typeof auth === 'string' && auth.startsWith('Bearer ')
        ? auth.slice(7)
        : null;
    if (!token) {
      throw new ForbiddenException('Recent login required');
    }
    const decoded = jwt.decode(token) as { auth_time?: number; iat?: number } | null;
    const ts = decoded?.auth_time ?? decoded?.iat;
    if (typeof ts !== 'number') {
      throw new ForbiddenException('Recent login required');
    }
    const ageSec = Math.floor(Date.now() / 1000) - ts;
    if (ageSec > this.recentLoginSeconds()) {
      throw new ForbiddenException(
        'Recent login required — sign in again or complete MFA',
      );
    }
    return true;
  }
}
