import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type SessionStatus = {
  userId: string;
  revoked: boolean;
  /** Most recent access-token jti bound to this session, if known. */
  accessTokenJti: string | null;
};

const CACHE_TTL_MS = 30 * 1000;

/**
 * Reads `api_user_sessions` to validate `jb_sid` on every authenticated request.
 *
 * Keeps a short in-memory cache so the per-request DB hit is bounded. Cache
 * entries are bypassed/invalidated by `invalidate(sessionId)` (logout, revoke).
 *
 * IMPORTANT: this is the only place SessionAuthGuard consults to enforce
 * server-side revocation of `jb_at`. Without this, a stolen access JWT would
 * remain valid until Supabase `exp` even after logout.
 */
@Injectable()
export class SessionRevocationService {
  private readonly cache = new Map<
    string,
    { value: SessionStatus | null; expiresAt: number }
  >();

  constructor(private readonly supabase: SupabaseService) {}

  /** Returns the session status (cached up to 30s); null if the session row is missing. */
  async getStatus(sessionId: string): Promise<SessionStatus | null> {
    const now = Date.now();
    const hit = this.cache.get(sessionId);
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }
    const value = await this.fetchStatus(sessionId);
    this.cache.set(sessionId, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  }

  /** Drop a cache entry (call after logout, refresh, revoke). */
  invalidate(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  /** Drop the entire cache (e.g. when admin suspends a user). */
  invalidateAll(): void {
    this.cache.clear();
  }

  private async fetchStatus(sessionId: string): Promise<SessionStatus | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('api_user_sessions')
      .select('user_id, revoked_at, access_token_jti')
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as {
      user_id: string;
      revoked_at: string | null;
      access_token_jti: string | null;
    };
    return {
      userId: row.user_id,
      revoked: row.revoked_at !== null,
      accessTokenJti: row.access_token_jti,
    };
  }
}
