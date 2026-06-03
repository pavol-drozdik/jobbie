import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtVerifyService } from './jwt-verify.service';
import { CurrentUser } from './auth.types';
import { SessionCookieService } from './session/session-cookie.service';

/**
 * Like JwksAuthGuard but does not throw when token is missing or invalid.
 * Sets request.user to CurrentUser when token is valid, otherwise null.
 * Use for GET /jobs list so unauthenticated users get default sort.
 */
@Injectable()
export class OptionalJwksAuthGuard implements CanActivate {
  constructor(
    private jwtVerify: JwtVerifyService,
    private cookies: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const fromCookie = this.cookies.readCookies(request).accessToken;
    const auth = request.headers.authorization;
    const bearer =
      typeof auth === 'string' && auth.startsWith('Bearer ')
        ? auth.slice(7)
        : null;
    const user = await this.jwtVerify.verifyToken(
      bearer ?? fromCookie ?? undefined,
    );
    (request as Request & { user: CurrentUser | null }).user = user ?? null;
    return true;
  }
}
