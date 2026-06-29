import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';
import { SupabaseService } from '../supabase/supabase.service';
import { SessionRevocationService } from './session-revocation.service';

// SECURITY: Generic login errors in controllers — do not distinguish unknown email vs wrong password.
const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 30;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
    private sessionRevocation: SessionRevocationService,
  ) {}

  async verifyTurnstileToken(token: string | undefined): Promise<{
    ok: boolean;
    skipped: boolean;
  }> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret?.trim()) {
      return { ok: true, skipped: true };
    }
    if (!token?.trim()) {
      return { ok: false, skipped: false };
    }
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    const res = await fetchWithTimeout(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body, timeoutMs: 10_000, metricsTarget: 'turnstile' },
    );
    const data = (await res.json()) as { success?: boolean };
    return { ok: data.success === true, skipped: false };
  }

  /** Turnstile required only after at least one failed attempt (when secret is configured). */
  async requiresCaptchaForLogin(rawEmail: string): Promise<boolean> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret?.trim()) {
      return false;
    }
    const email = normalizeEmail(rawEmail);
    if (!email) {
      return false;
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('login_attempt_counters')
      .select('failed_count')
      .eq('email_normalized', email)
      .maybeSingle();
    if (error || !data) {
      return false;
    }
    const failed = (data as { failed_count: number }).failed_count ?? 0;
    return failed > 0;
  }

  async getLoginStatus(rawEmail: string): Promise<{
    allowed: boolean;
    retry_after_seconds: number | null;
  }> {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      return { allowed: true, retry_after_seconds: null };
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('login_attempt_counters')
      .select('locked_until')
      .eq('email_normalized', email)
      .maybeSingle();
    if (error || !data) {
      return { allowed: true, retry_after_seconds: null };
    }
    const row = data as { locked_until: string | null };
    if (row.locked_until) {
      const until = new Date(row.locked_until);
      const remainingMs = until.getTime() - Date.now();
      if (remainingMs > 0) {
        return {
          allowed: false,
          retry_after_seconds: Math.ceil(remainingMs / 1000),
        };
      }
    }
    return { allowed: true, retry_after_seconds: null };
  }

  /** Clears brute-force lockout after a verified login (BFF session bootstrap). */
  async clearLoginLockout(email: string): Promise<void> {
    await this.recordLoginAttempt({ email, success: true, ip: null });
  }

  async recordLoginAttempt(input: {
    email: string;
    success: boolean;
    ip: string | null;
  }): Promise<void> {
    const email = normalizeEmail(input.email);
    if (!email) return;
    const client = this.supabase.getClient();
    if (input.success) {
      const { error } = await client.from('login_attempt_counters').upsert(
        {
          email_normalized: email,
          failed_count: 0,
          locked_until: null,
          last_failed_ip: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email_normalized' },
      );
      if (error) {
        this.logger.warn(`recordLoginAttempt success reset failed: ${error.message}`);
      }
      return;
    }
    const { data: row } = await client
      .from('login_attempt_counters')
      .select('failed_count, locked_until')
      .eq('email_normalized', email)
      .maybeSingle();
    const prev = (row as { failed_count: number } | null)?.failed_count ?? 0;
    const next = prev + 1;
    const lockedUntil =
      next >= MAX_FAILED
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;
    const { error } = await client.from('login_attempt_counters').upsert(
      {
        email_normalized: email,
        failed_count: next,
        locked_until: lockedUntil,
        last_failed_ip: input.ip,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email_normalized' },
    );
    if (error) {
      this.logger.warn(`recordLoginAttempt fail increment: ${error.message}`);
    }
  }

  async registerDeviceAndNotify(input: {
    userId: string;
    deviceId: string;
    userAgent: string | null;
    ip: string | null;
  }): Promise<{ isNewDevice: boolean }> {
    const client = this.supabase.getClient();
    const { data: existingRow } = await client
      .from('user_device_sessions')
      .select('id, last_ip')
      .eq('user_id', input.userId)
      .eq('device_id', input.deviceId)
      .maybeSingle();
    const now = new Date().toISOString();
    if (existingRow) {
      await client
        .from('user_device_sessions')
        .update({
          last_seen: now,
          user_agent: input.userAgent,
          last_ip: input.ip,
        })
        .eq('user_id', input.userId)
        .eq('device_id', input.deviceId);
      return { isNewDevice: false };
    }
    const { error } = await client.from('user_device_sessions').insert({
      user_id: input.userId,
      device_id: input.deviceId,
      user_agent: input.userAgent,
      last_ip: input.ip,
      last_seen: now,
      created_at: now,
    });
    if (error) {
      this.logger.warn(`registerDevice: ${error.message}`);
      return { isNewDevice: false };
    }
    return { isNewDevice: true };
  }

  async listDeviceSessions(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('user_device_sessions')
      .select('id, device_id, user_agent, last_ip, last_seen, created_at')
      .eq('user_id', userId)
      .order('last_seen', { ascending: false });
    if (error) {
      return [];
    }
    return data ?? [];
  }

  async deleteDeviceSession(userId: string, sessionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .getClient()
      .from('user_device_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('id', sessionId);
    return !error;
  }

  private supabaseAdminSignOut(
    userAccessToken: string,
    scope: 'global' | 'local' | 'others',
  ): Promise<void> {
    const admin = this.supabase.getClient().auth.admin as {
      signOut: (
        jwt: string,
        scope?: 'global' | 'local' | 'others',
      ) => Promise<{ error: { message: string } | null }>;
    };
    return admin.signOut(userAccessToken, scope).then(({ error }) => {
      if (error) {
        this.logger.warn(`supabase signOut(${scope}): ${error.message}`);
        throw new BadRequestException('Could not revoke sessions');
      }
    });
  }

  async revokeOtherSupabaseSessions(userAccessToken: string): Promise<void> {
    await this.supabaseAdminSignOut(userAccessToken, 'others');
  }

  /** Invalidates every Supabase refresh token for the user (all devices). */
  async revokeAllSupabaseSessions(userAccessToken: string): Promise<void> {
    await this.supabaseAdminSignOut(userAccessToken, 'global');
  }

  /** Revokes all Nest BFF cookie sessions for the user. */
  async revokeAllApiUserSessions(userId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .update({
        revoked_at: new Date().toISOString(),
        access_token_jti: null,
      })
      .eq('user_id', userId)
      .is('revoked_at', null);
    if (error) {
      this.logger.warn(`revokeAllApiUserSessions: ${error.message}`);
      throw new BadRequestException('Could not revoke API sessions');
    }
    this.sessionRevocation.invalidateAll();
  }

  async syncPhoneVerificationFromAuth(userId: string): Promise<{ synced: boolean }> {
    const { data, error } = await this.supabase
      .getClient()
      .auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return { synced: false };
    }
    const u = data.user;
    if (!u.phone_confirmed_at || !u.phone) {
      return { synced: false };
    }
    const { error: upErr } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        phone_e164: u.phone,
        phone_verified_at: u.phone_confirmed_at,
      })
      .eq('id', userId);
    if (upErr) {
      this.logger.warn(`syncPhoneVerificationFromAuth: ${upErr.message}`);
      return { synced: false };
    }
    return { synced: true };
  }

  /** True when auth.users already has this email (service role lookup). */
  async isSignupEmailTaken(rawEmail: string): Promise<boolean> {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      return false;
    }
    const adminApi = this.supabase.getClient().auth.admin as {
      getUserByEmail?: (lookupEmail: string) => Promise<{
        data: { user?: { id: string } | null };
        error: { message: string } | null;
      }>;
    };
    if (typeof adminApi.getUserByEmail !== 'function') {
      this.logger.warn('auth.admin.getUserByEmail unavailable for signup check');
      return false;
    }
    try {
      const { data, error } = await adminApi.getUserByEmail(email);
      if (error || !data?.user?.id) {
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `isSignupEmailTaken failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
