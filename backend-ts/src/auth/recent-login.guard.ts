import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_RECENT_LOGIN_KEY } from './require-recent-login.decorator';
import { AuthenticatedRequest } from './session-auth.guard';
import { JwtVerifyService } from './jwt-verify.service';
import { SessionService } from './session/session.service';
import { SessionCookieService } from './session/session-cookie.service';

/**
 * Enforces api_user_sessions.last_step_up_at within RECENT_LOGIN_MINUTES when
 * @RequireRecentLogin(). Reads session id from cookies directly because this
 * APP_GUARD runs before GlobalAuthGuard populates request.sessionId.
 */
@Injectable()
export class RecentLoginGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly cookies: SessionCookieService,
    private readonly jwtVerify: JwtVerifyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_RECENT_LOGIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authed = request as AuthenticatedRequest;
    const cookieParts = this.cookies.readCookies(request);
    let sessionId = authed.sessionId ?? cookieParts.sessionId;

    let resolvedUserId = authed.user?.id?.trim() || '';
    const authHeader = request.headers.authorization;
    const bearer =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;
    if (!resolvedUserId) {
      const user = await this.jwtVerify.verifyToken(
        cookieParts.accessToken || bearer || undefined,
      );
      resolvedUserId = user?.id?.trim() || '';
    }
    if (!resolvedUserId.length) {
      return true;
    }

    if (!sessionId) {
      sessionId = await this.sessions.resolveSessionIdForRecentLogin(
        resolvedUserId,
        null,
        cookieParts.accessToken ?? bearer ?? null,
      );
    }
    if (!sessionId) {
      throw new ForbiddenException({
        message: 'Recent authentication required',
        step_up_required: true,
      });
    }

    await this.sessions.assertRecentLogin(sessionId, resolvedUserId);
    return true;
  }
}
