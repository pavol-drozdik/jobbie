import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtVerifyService } from './jwt-verify.service';
import { CurrentUser } from './auth.types';
import { SessionCookieService } from './session/session-cookie.service';
import { SessionRevocationService } from './session-revocation.service';

/**
 * Session auth precedence:
 * - Bearer only or cookie only: single verify (one profile read when cache miss).
 * - Both present: verify Bearer first; if valid, compare cookie JWT `sub` without second profile read.
 * - If both JWTs verify to different subjects → 401 (no silent user switch).
 *
 * Additionally, when a `jb_sid` cookie is present:
 *  - Reject the request if the session row is missing or revoked.
 *  - Reject the request if the bound `access_token_jti` differs from the token presented
 *    (i.e. `jb_at` no longer matches the current session — happens after logout or
 *    refresh rotation; defeats replay of a stolen `jb_at` until Supabase `exp`).
 */
export type AuthenticatedRequest = Request & {
  user: CurrentUser;
  sessionId: string | null;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly jwtVerify: JwtVerifyService,
    private readonly cookies: SessionCookieService,
    private readonly sessionRevocation: SessionRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookies = this.cookies.readCookies(request);
    const fromCookie = cookies.accessToken;
    const sessionId = cookies.sessionId;
    const authHeader = request.headers.authorization;
    const bearer =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    let user: CurrentUser | null = null;
    let acceptedToken: string | null = null;
    if (sessionId && fromCookie) {
      user = await this.jwtVerify.verifyToken(fromCookie);
      if (user) {
        acceptedToken = fromCookie;
        if (bearer) {
          const bearerUser = await this.jwtVerify.verifyToken(bearer);
          if (bearerUser && bearerUser.id !== user.id) {
            throw new UnauthorizedException('Conflicting session tokens');
          }
        }
      }
    } else if (bearer && fromCookie) {
      user = await this.jwtVerify.verifyToken(bearer);
      if (user) {
        acceptedToken = bearer;
        const cookieClaims = await this.jwtVerify.verifyTokenClaims(fromCookie);
        if (cookieClaims && cookieClaims.sub !== user.id) {
          throw new UnauthorizedException('Conflicting session tokens');
        }
      } else {
        user = await this.jwtVerify.verifyToken(fromCookie);
        if (user) acceptedToken = fromCookie;
      }
    } else if (fromCookie) {
      user = await this.jwtVerify.verifyToken(fromCookie);
      if (user) acceptedToken = fromCookie;
    } else if (bearer) {
      user = await this.jwtVerify.verifyToken(bearer);
      if (user) acceptedToken = bearer;
    }

    if (!user || !acceptedToken) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    if (sessionId) {
      const status = await this.sessionRevocation.getStatus(sessionId);
      if (!status || status.revoked || status.userId !== user.id) {
        throw new UnauthorizedException('Session revoked');
      }
      if (status.accessTokenJti) {
        const claims = await this.jwtVerify.verifyTokenClaims(acceptedToken);
        if (!claims || claims.jti !== status.accessTokenJti) {
          throw new UnauthorizedException('Session token rotated');
        }
      }
    }

    (request as AuthenticatedRequest).user = user;
    (request as AuthenticatedRequest).sessionId = sessionId;
    return true;
  }
}
