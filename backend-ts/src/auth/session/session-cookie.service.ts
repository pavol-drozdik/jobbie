import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { createHash, randomBytes } from 'crypto';
import {
  COOKIE_ACCESS,
  COOKIE_CSRF,
  COOKIE_REFRESH,
  COOKIE_SESSION,
} from './session.constants';
import { isNodeProduction } from '../../common/runtime-env.util';

@Injectable()
export class SessionCookieService {
  constructor(private readonly config: ConfigService) {}

  /** Stored in api_user_sessions; raw refresh token never persisted. */
  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  newCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private cookieOptions(maxAgeMs: number): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict';
    path: string;
    maxAge: number;
    domain?: string;
  } {
    const domain = this.config.get<string>('SESSION_COOKIE_DOMAIN')?.trim();
    return {
      httpOnly: true,
      secure: isNodeProduction(),
      sameSite: 'lax',
      path: '/api',
      maxAge: maxAgeMs,
      ...(domain ? { domain } : {}),
    };
  }

  setSessionCookies(
    res: Response,
    input: {
      sessionId: string;
      accessToken: string;
      refreshToken: string;
      csrfToken: string;
      accessTtlSeconds: number;
      refreshTtlDays: number;
    },
  ): void {
    const accessMs = input.accessTtlSeconds * 1000;
    const refreshMs = input.refreshTtlDays * 24 * 60 * 60 * 1000;
    res.cookie(COOKIE_SESSION, input.sessionId, this.cookieOptions(refreshMs));
    res.cookie(COOKIE_ACCESS, input.accessToken, {
      ...this.cookieOptions(accessMs),
      path: '/',
    });
    res.cookie(COOKIE_REFRESH, input.refreshToken, this.cookieOptions(refreshMs));
    // Readable by JS so PWA can mirror it in X-CSRF-Token; still SameSite-protected.
    res.cookie(COOKIE_CSRF, input.csrfToken, {
      ...this.cookieOptions(refreshMs),
      httpOnly: false,
    });
  }

  clearSessionCookies(res: Response): void {
    const domain = this.config.get<string>('SESSION_COOKIE_DOMAIN')?.trim();
    const clearOpts = {
      path: '/api',
      ...(domain ? { domain } : {}),
    };
    for (const name of [COOKIE_SESSION, COOKIE_REFRESH, COOKIE_CSRF]) {
      res.clearCookie(name, clearOpts);
    }
    res.clearCookie(COOKIE_ACCESS, { ...clearOpts, path: '/' });
  }

  readCookies(req: Request): {
    sessionId: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    csrfToken: string | null;
  } {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return {
      sessionId: cookies?.[COOKIE_SESSION]?.trim() || null,
      accessToken: cookies?.[COOKIE_ACCESS]?.trim() || null,
      refreshToken: cookies?.[COOKIE_REFRESH]?.trim() || null,
      csrfToken: cookies?.[COOKIE_CSRF]?.trim() || null,
    };
  }

  accessTtlSeconds(): number {
    const raw = Number(this.config.get('SESSION_ACCESS_TTL_SECONDS') ?? 3600);
    return Number.isFinite(raw) && raw > 60 ? raw : 3600;
  }

  refreshTtlDays(): number {
    const raw = Number(this.config.get('SESSION_REFRESH_TTL_DAYS') ?? 30);
    return Number.isFinite(raw) && raw >= 1 ? raw : 30;
  }
}
