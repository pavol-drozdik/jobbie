import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { timingSafeStringEqual } from '../../common/timing-safe.util';
import { AuditService } from '../../audit/audit.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { JwtVerifyService } from '../jwt-verify.service';
import { SessionCookieService } from './session-cookie.service';
import { SessionRevocationService } from '../session-revocation.service';
import { AuthSecurityService } from '../auth-security.service';
import { RECENT_LOGIN_MINUTES } from './session.constants';

@Injectable()
export class SessionService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtVerify: JwtVerifyService,
    private readonly cookies: SessionCookieService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly sessionRevocation: SessionRevocationService,
    private readonly authSecurity: AuthSecurityService,
  ) {}

  private async deriveJti(token: string): Promise<string | null> {
    const claims = await this.jwtVerify.verifyTokenClaims(token);
    return claims?.jti ?? null;
  }

  async establishSession(
    res: Response,
    input: {
      accessToken: string;
      refreshToken: string;
      deviceId?: string;
      userAgent?: string;
      ip?: string | null;
    },
  ): Promise<{ ok: true; csrf_token: string }> {
    const user = await this.jwtVerify.verifyToken(input.accessToken);
    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const refreshHash = this.cookies.hashRefreshToken(input.refreshToken);
    const csrfToken = this.cookies.newCsrfToken();
    const accessJti = await this.deriveJti(input.accessToken);

    const { data: row, error } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .insert({
        user_id: user.id,
        refresh_token_hash: refreshHash,
        access_token_jti: accessJti,
        device_id: input.deviceId ?? null,
        user_agent: input.userAgent ?? null,
        last_ip: input.ip ?? null,
        // Fresh login satisfies step-up for billing (MFA users reach aal2 before syncSession).
        last_step_up_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !row?.id) {
      throw new UnauthorizedException('Could not create session');
    }

    this.cookies.setSessionCookies(res, {
      sessionId: row.id as string,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      csrfToken,
      accessTtlSeconds: this.cookies.accessTtlSeconds(),
      refreshTtlDays: this.cookies.refreshTtlDays(),
    });

    void this.audit.recordAuthSecurityEvent({
      emailNormalized: user.email.toLowerCase(),
      actorUserId: user.id,
      eventKind: 'login_success',
      success: true,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      deviceId: input.deviceId ?? null,
      metadata: { session_id: row.id },
    });

    void this.authSecurity.clearLoginLockout(user.email).catch(() => undefined);

    return { ok: true, csrf_token: csrfToken };
  }

  /**
   * Rotate refresh token hash and re-issue CSRF on every refresh.
   *
   * Refresh rotation is **single-use**: the new hash is written via a conditional
   * UPDATE that matches both `id` and the previous `refresh_token_hash`. If two
   * requests race with the same old refresh, exactly one wins; the loser's
   * UPDATE matches 0 rows and we revoke the session entirely (stolen-refresh
   * detection per OWASP recommended pattern).
   */
  async refreshSession(
    req: Request,
    res: Response,
  ): Promise<{ ok: true; access_token: string; refresh_token: string; csrf_token: string }> {
    const { sessionId, refreshToken } = this.cookies.readCookies(req);
    if (!sessionId || !refreshToken) {
      throw new UnauthorizedException('Missing session');
    }

    const { data: sessionRow } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .select('id, user_id, revoked_at, refresh_token_hash')
      .eq('id', sessionId)
      .maybeSingle();

    if (!sessionRow || sessionRow.revoked_at) {
      throw new UnauthorizedException('Session revoked');
    }

    const oldHash = this.cookies.hashRefreshToken(refreshToken);
    if (!timingSafeStringEqual(sessionRow.refresh_token_hash as string, oldHash)) {
      throw new UnauthorizedException('Invalid session');
    }

    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      throw new UnauthorizedException('Auth not configured');
    }

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session?.access_token || !data.session.refresh_token) {
      throw new UnauthorizedException('Could not refresh session');
    }

    const user = await this.jwtVerify.verifyToken(data.session.access_token);
    if (!user || user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const newHash = this.cookies.hashRefreshToken(data.session.refresh_token);
    const newAccessJti = await this.deriveJti(data.session.access_token);

    // Atomic single-use rotation: UPDATE only if hash still matches the
    // refresh token presented. Two concurrent requests with the same old
    // refresh cannot both win.
    const { data: rotated, error: rotateError } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .update({
        refresh_token_hash: newHash,
        access_token_jti: newAccessJti,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('refresh_token_hash', oldHash)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();

    if (rotateError || !rotated) {
      // Lost the race or someone presented a replayed refresh: revoke the
      // session entirely; the legitimate user must re-authenticate.
      await this.supabase
        .getClient()
        .from('api_user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', sessionId);
      this.sessionRevocation.invalidate(sessionId);
      this.cookies.clearSessionCookies(res);
      throw new UnauthorizedException('Refresh token replay detected');
    }

    this.sessionRevocation.invalidate(sessionId);
    const csrfToken = this.cookies.newCsrfToken();
    this.cookies.setSessionCookies(res, {
      sessionId,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      csrfToken,
      accessTtlSeconds: this.cookies.accessTtlSeconds(),
      refreshTtlDays: this.cookies.refreshTtlDays(),
    });

    return {
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      csrf_token: csrfToken,
    };
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const { sessionId } = this.cookies.readCookies(req);
    if (sessionId) {
      await this.supabase
        .getClient()
        .from('api_user_sessions')
        .update({
          revoked_at: new Date().toISOString(),
          access_token_jti: null,
        })
        .eq('id', sessionId);
      this.sessionRevocation.invalidate(sessionId);
    }
    this.cookies.clearSessionCookies(res);
    // Omit executionContexts — not supported in Chromium (console warning on logout).
    res.setHeader('Clear-Site-Data', '"cache", "storage"');
    return { ok: true };
  }

  async stepUp(
    req: Request,
    accessToken: string,
  ): Promise<{ ok: true }> {
    const user = await this.jwtVerify.verifyToken(accessToken);
    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }
    if (user.aal !== 'aal2') {
      const hasVerifiedTotp = await this.userHasVerifiedTotp(user.id);
      if (hasVerifiedTotp) {
        throw new ForbiddenException({
          message: 'MFA verification required',
          step_up_required: true,
        });
      }
    }

    const cookieSessionId = this.cookies.readCookies(req).sessionId;
    let row = await this.resolveActiveSessionRow(user.id, cookieSessionId);
    if (!row) {
      const accessJti = await this.deriveJti(accessToken);
      if (accessJti) {
        row = await this.resolveActiveSessionRowByAccessJti(user.id, accessJti);
      }
    }
    if (!row) {
      throw new UnauthorizedException('Missing session');
    }

    const { error } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .update({ last_step_up_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('user_id', user.id)
      .is('revoked_at', null);

    if (error) {
      throw new UnauthorizedException('Could not update session');
    }
    return { ok: true };
  }

  private async userHasVerifiedTotp(userId: string): Promise<boolean> {
    const admin = this.supabase.getClient().auth.admin as {
      mfa?: {
        listFactors: (params: {
          userId: string;
        }) => Promise<{
          data: { factors?: Array<{ factor_type?: string; status?: string }> } | null;
          error: { message: string } | null;
        }>;
      };
    };
    if (!admin.mfa?.listFactors) {
      return false;
    }
    const { data, error } = await admin.mfa.listFactors({ userId });
    if (error || !data?.factors?.length) {
      return false;
    }
    return data.factors.some(
      (f) => f.factor_type === 'totp' && f.status === 'verified',
    );
  }

  private stepUpCutoffMs(): number {
    return Date.now() - RECENT_LOGIN_MINUTES * 60 * 1000;
  }

  /**
   * Resolves the session row matching the `jb_sid` cookie.
   *
   * SECURITY: We deliberately do NOT fall back to "the user's latest active
   * session" when `preferredSessionId` is missing. A Bearer-only client (no
   * jb_sid) used to satisfy step-up via another device's `last_step_up_at`
   * timestamp — meaning a stolen JWT could be elevated by piggybacking on
   * the legitimate user's activity on a different machine. Now we require a
   * matching session row and force the caller to re-establish a cookie
   * session if they want to perform step-up-protected actions.
   */
  private async resolveActiveSessionRowByAccessJti(
    userId: string,
    accessJti: string,
  ): Promise<{
    id: string;
    last_step_up_at: string | null;
    revoked_at: string | null;
    created_at: string;
    last_seen_at: string;
  } | null> {
    const select =
      'id, last_step_up_at, revoked_at, created_at, last_seen_at' as const;
    const { data } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .select(select)
      .eq('user_id', userId)
      .eq('access_token_jti', accessJti)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    const row = Array.isArray(data) ? data[0] : data;
    return row && !row.revoked_at ? row : null;
  }

  private async resolveActiveSessionRow(
    userId: string,
    preferredSessionId: string | null,
  ): Promise<{
    id: string;
    last_step_up_at: string | null;
    revoked_at: string | null;
    created_at: string;
    last_seen_at: string;
  } | null> {
    if (!preferredSessionId) return null;
    const select =
      'id, last_step_up_at, revoked_at, created_at, last_seen_at' as const;
    const { data } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .select(select)
      .eq('id', preferredSessionId)
      .eq('user_id', userId)
      .maybeSingle();
    return data && !data.revoked_at ? data : null;
  }

  /** Legacy sessions without last_step_up_at but recent activity (pre-migration). */
  private async healStepUpIfRecentlyActive(sessionRowId: string): Promise<boolean> {
    const { data } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .select('created_at, last_seen_at, last_step_up_at')
      .eq('id', sessionRowId)
      .maybeSingle();
    if (!data) return false;

    const cutoff = this.stepUpCutoffMs();
    const activityMs = Math.max(
      new Date(data.created_at as string).getTime(),
      new Date(data.last_seen_at as string).getTime(),
    );
    if (activityMs < cutoff) return false;

    const existing = data.last_step_up_at
      ? new Date(data.last_step_up_at as string).getTime()
      : 0;
    if (existing >= cutoff) return true;

    const { error } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .update({ last_step_up_at: new Date().toISOString() })
      .eq('id', sessionRowId);

    return !error;
  }

  /**
   * Resolves `api_user_sessions.id` for @RequireRecentLogin when `jb_sid` is missing
   * but `jb_at` still matches a row (cookie path drift on some browsers).
   */
  async resolveSessionIdForRecentLogin(
    userId: string,
    sessionIdFromCookie: string | null,
    accessTokenFromCookie: string | null,
  ): Promise<string | null> {
    const trimmed = sessionIdFromCookie?.trim();
    if (trimmed) {
      return trimmed;
    }
    const access = accessTokenFromCookie?.trim();
    if (!access) {
      return null;
    }
    const jti = await this.deriveJti(access);
    if (!jti) {
      return null;
    }
    const row = await this.resolveActiveSessionRowByAccessJti(userId, jti);
    return row?.id ?? null;
  }

  /** Step-up window for billing, account delete, admin moderation (@RequireRecentLogin). */
  async assertRecentLogin(sessionId: string | null, userId: string): Promise<void> {
    const row = await this.resolveActiveSessionRow(userId, sessionId);
    if (!row) {
      throw new ForbiddenException({
        message: 'Recent authentication required',
        step_up_required: true,
      });
    }

    const cutoff = this.stepUpCutoffMs();
    const stepUp = row.last_step_up_at
      ? new Date(row.last_step_up_at as string).getTime()
      : 0;
    if (stepUp >= cutoff) {
      return;
    }

    if (await this.healStepUpIfRecentlyActive(row.id)) {
      return;
    }

    throw new ForbiddenException({
      message: 'Recent authentication required',
      step_up_required: true,
    });
  }
}
