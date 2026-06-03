import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { CSRF_HEADER } from './session/session.constants';
import { SessionCookieService } from './session/session-cookie.service';
import { timingSafeStringEqual } from '../common/timing-safe.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cookies: SessionCookieService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const { sessionId, csrfToken: cookieCsrf } = this.cookies.readCookies(request);
    // NOTE: No jb_sid — JWT-only / legacy clients; CSRF applies only to cookie-bound BFF sessions.
    if (!sessionId) {
      return true;
    }
    // SECURITY: Mutations with jb_sid must present matching jb_csrf cookie + X-CSRF-Token header.

    const headerRaw = request.headers[CSRF_HEADER];
    const headerCsrf = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    if (
      !cookieCsrf ||
      !headerCsrf ||
      cookieCsrf.length < 16 ||
      !timingSafeStringEqual(headerCsrf, cookieCsrf)
    ) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
