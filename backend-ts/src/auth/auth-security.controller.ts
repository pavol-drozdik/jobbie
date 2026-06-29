import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUserDecorator } from './current-user.decorator';
import type { CurrentUser } from './auth.types';
import { AuthSecurityService } from './auth-security.service';
import { SessionCookieService } from './session/session-cookie.service';
import { AuditService } from '../audit/audit.service';
import { Public } from './public.decorator';
import { RequireRecentLogin } from './require-recent-login.decorator';
import {
  LoginAttemptDto,
  LoginStatusDto,
  SessionHeartbeatDto,
  SessionReportDto,
  SignupEmailStatusDto,
  VerifyCaptchaDto,
} from './auth-security.dto';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function bearerToken(authorization: string | undefined): string {
  const raw = authorization?.trim();
  if (raw?.toLowerCase().startsWith('bearer ') && raw.length > 7) {
    return raw.slice(7).trim();
  }
  return '';
}

function resolveSupabaseAccessToken(
  req: Request,
  authorization: string | undefined,
  sessionCookies: SessionCookieService,
): string {
  const fromHeader = bearerToken(authorization);
  if (fromHeader) return fromHeader;
  return sessionCookies.readCookies(req).accessToken ?? '';
}

function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',')[0]?.trim() ?? null;
  }
  const a = req.socket?.remoteAddress;
  return a ?? null;
}

@Controller('auth')
export class AuthSecurityController {
  constructor(
    private security: AuthSecurityService,
    private audit: AuditService,
    private sessionCookies: SessionCookieService,
  ) {}

  @Post('captcha/verify')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async verifyCaptcha(@Body() body: VerifyCaptchaDto) {
    return this.security.verifyTurnstileToken(body.token);
  }

  @Post('security/login-status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async loginStatus(
    @Body() body: LoginStatusDto,
  ): Promise<{
    allowed: boolean;
    retry_after_seconds: number | null;
    captcha_required: boolean;
  }> {
    // Turnstile tokens are single-use; Supabase Auth verifies captcha on sign-in.
    // Do not call siteverify here — it would consume the token before Supabase can use it.
    const captchaRequired = await this.security.requiresCaptchaForLogin(
      body.email,
    );
    const status = await this.security.getLoginStatus(body.email);
    return { ...status, captcha_required: captchaRequired };
  }

  @Post('security/signup-email-status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async signupEmailStatus(
    @Body() body: SignupEmailStatusDto,
  ): Promise<{ available: boolean }> {
    // Captcha is enforced by Supabase signUp; do not siteverify here (single-use tokens).
    const taken = await this.security.isSignupEmailTaken(body.email);
    return { available: !taken };
  }

  @Post('security/login-attempt')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async loginAttempt(
    @Body() body: LoginAttemptDto,
    @Req() req: Request,
  ): Promise<{ ok: boolean; allowed: boolean; retry_after_seconds: number | null }> {
    if (body.success) {
      throw new BadRequestException(
        'Login success is recorded server-side after session establishment.',
      );
    }
    if (!body.success) {
      const before = await this.security.getLoginStatus(body.email);
      if (!before.allowed) {
        throw new HttpException(
          {
            message:
              'Príliš veľa neúspešných pokusov. Skúste znova neskôr.',
            retry_after_seconds: before.retry_after_seconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    const headerUa =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null;
    const userAgent = body.user_agent?.trim() || headerUa;
    await this.security.recordLoginAttempt({
      email: body.email,
      success: body.success,
      ip: clientIp(req),
    });
    void this.audit.recordAuthSecurityEvent({
      emailNormalized: normalizeEmail(body.email),
      actorUserId: null,
      eventKind: body.success
        ? 'login_attempt_success'
        : 'login_attempt_failure',
      success: body.success,
      ip: clientIp(req),
      userAgent,
      deviceId: null,
      metadata: {},
    });
    const after = await this.security.getLoginStatus(body.email);
    return {
      ok: true,
      allowed: after.allowed,
      retry_after_seconds: after.retry_after_seconds,
    };
  }

  @Post('security/session')
  async sessionReport(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: SessionReportDto,
    @Req() req: Request,
  ): Promise<{ ok: boolean }> {
    const ua =
      body.user_agent ??
      (typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null);
    await this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: clientIp(req),
      actorUserAgent: ua,
      sessionId: null,
      deviceId: body.device_id ?? null,
      eventType:
        body.kind === 'login_success'
          ? 'auth.session.login_success'
          : 'auth.session.logout',
      subjectType: 'user',
      subjectId: user.id,
      payload: {
        kind: body.kind,
        remember_me:
          typeof body.remember_me === 'boolean' ? body.remember_me : undefined,
      },
    });
    return { ok: true };
  }

  @Get('sessions')
  async listSessions(@CurrentUserDecorator() user: CurrentUser) {
    const items = await this.security.listDeviceSessions(user.id);
    return { items };
  }

  @Delete('sessions/:sessionId')
  @RequireRecentLogin()
  async deleteSession(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('sessionId') sessionId: string,
  ): Promise<{ ok: boolean }> {
    const ok = await this.security.deleteDeviceSession(user.id, sessionId);
    return { ok };
  }

  @Post('sessions/revoke-others')
  @RequireRecentLogin()
  async revokeOthers(
    @Headers('authorization') authorization: string | undefined,
    @Req() req: Request,
  ): Promise<{ ok: boolean }> {
    const accessToken = resolveSupabaseAccessToken(
      req,
      authorization,
      this.sessionCookies,
    );
    if (!accessToken) {
      throw new BadRequestException('Access token required');
    }
    await this.security.revokeOtherSupabaseSessions(accessToken);
    return { ok: true };
  }

  /** Password reset / change: invalidate Supabase + BFF sessions on all devices. */
  @Post('sessions/revoke-all')
  @RequireRecentLogin()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async revokeAllSessions(
    @CurrentUserDecorator() user: CurrentUser,
    @Headers('authorization') authorization: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    const accessToken = resolveSupabaseAccessToken(
      req,
      authorization,
      this.sessionCookies,
    );
    if (!accessToken) {
      throw new BadRequestException('Access token required');
    }
    await this.security.revokeAllApiUserSessions(user.id);
    await this.security.revokeAllSupabaseSessions(accessToken);
    this.sessionCookies.clearSessionCookies(res);
    void this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: clientIp(req),
      actorUserAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null,
      sessionId: null,
      deviceId: null,
      eventType: 'auth.sessions.revoked_all',
      subjectType: 'user',
      subjectId: user.id,
      payload: { reason: 'password_change' },
    });
    return { ok: true };
  }

  @Post('sessions/heartbeat')
  async heartbeat(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: SessionHeartbeatDto,
    @Req() req: Request,
  ): Promise<{ is_new_device: boolean }> {
    const ua =
      body.userAgent ??
      (typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null);
    const res = await this.security.registerDeviceAndNotify({
      userId: user.id,
      deviceId: body.deviceId,
      userAgent: ua,
      ip: clientIp(req),
    });
    return { is_new_device: res.isNewDevice };
  }

  @Post('phone/sync-profile')
  async syncPhoneProfile(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ synced: boolean }> {
    return this.security.syncPhoneVerificationFromAuth(user.id);
  }
}
