import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AppRole,
  AuthenticatorAssuranceLevel,
  CurrentUser,
  UserRole,
} from './auth.types';
import { effectiveAppRoleForScopes, mergeScopesForUser } from './scopes';
import { ProfileAuthCacheService } from './profile-auth-cache.service';

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

type ProfileRow = {
  role: string;
  app_role: string | null;
  extra_permission_scopes: string[] | null;
  account_status: string | null;
};

type TokenClaims = {
  sub: string;
  email: string;
  aal: AuthenticatorAssuranceLevel;
  jti: string;
};

/** Stable identifier for a Supabase access JWT — `jti` if present, otherwise `sub|iat`. */
function deriveJti(payload: {
  jti?: unknown;
  sub?: string;
  iat?: unknown;
}): string {
  if (typeof payload.jti === 'string' && payload.jti.length > 0) {
    return payload.jti;
  }
  const iat =
    typeof payload.iat === 'number' && Number.isFinite(payload.iat)
      ? payload.iat
      : 0;
  return `${payload.sub ?? ''}|${iat}`;
}

function toAal(value: unknown): AuthenticatorAssuranceLevel {
  if (value === 'aal2') return 'aal2';
  if (value === 'aal1') return 'aal1';
  return null;
}

function toAccountStatus(
  value: string | null | undefined,
): 'active' | 'suspended' | 'closed' {
  if (value === 'suspended' || value === 'closed') return value;
  return 'active';
}

function toUserRole(value: string | undefined): UserRole {
  return value === 'individual' ? UserRole.individual : UserRole.company;
}

function toAppRole(value: string | null | undefined): AppRole {
  if (value === 'employer' || value === 'freelancer' || value === 'admin') {
    return value;
  }
  return 'user';
}

@Injectable()
export class JwtVerifyService {
  private jwksClient: JwksClient | null = null;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
    private profileAuthCache: ProfileAuthCacheService,
  ) {}

  /** Drop cached profile auth (e.g. after admin suspend). */
  invalidateProfileCache(userId: string): void {
    void this.profileAuthCache.invalidate(userId);
  }

  private getJwksClient(): JwksClient {
    if (!this.jwksClient) {
      const url = this.config.get<string>('SUPABASE_URL');
      if (!url) throw new Error('Supabase URL not configured');
      const jwksUrl =
        url.replace(/\/$/, '') + '/auth/v1/.well-known/jwks.json';
      this.jwksClient = new JwksClient({
        jwksUri: jwksUrl,
        cache: true,
        cacheMaxAge: JWKS_CACHE_TTL_MS,
      });
    }
    return this.jwksClient;
  }

  private jwtVerifyOptions(): jwt.VerifyOptions {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '') ?? '';
    const issuer =
      this.config.get<string>('SUPABASE_JWT_ISSUER')?.trim() ||
      (supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined);
    const audience =
      this.config.get<string>('SUPABASE_JWT_AUDIENCE')?.trim() || 'authenticated';
    const verifyOpts: jwt.VerifyOptions = {};
    if (issuer) verifyOpts.issuer = issuer;
    verifyOpts.audience = audience;
    return verifyOpts;
  }

  /**
   * Verify a Supabase JWT.
   *
   * Security policy (post-2026-06 hardening):
   * - If `SUPABASE_JWT_ALLOW_HS256` is set, allow legacy HS256 verification
   *   against `SUPABASE_JWT_SECRET`. This is OFF by default; Supabase
   *   projects on asymmetric keys (default for new projects) must NOT enable
   *   it because it widens the trust surface to the shared HMAC secret.
   * - Asymmetric tokens are verified via JWKS. A token whose `kid` is not in
   *   JWKS is rejected; we never fall back to `keys[0]` (which would accept
   *   tokens signed with a previously rotated-out key) and we never fall
   *   back to HS256 when JWKS fetch fails (which would enable algorithm
   *   confusion if the secret leaks).
   */
  private async verifyJwtPayload(token: string): Promise<TokenClaims | null> {
    const t = token.startsWith('Bearer ') ? token.slice(7) : token;
    try {
      const decoded = jwt.decode(t, { complete: true }) as
        | { header: { kid?: string; alg?: string }; payload: unknown }
        | null;
      if (!decoded?.header) return null;
      const verifyOpts = this.jwtVerifyOptions();
      let payload: {
        sub?: string;
        email?: string;
        aal?: string;
        jti?: string;
        iat?: number;
      };
      const alg = decoded.header.alg;
      const allowHs256 =
        (this.config.get<string>('SUPABASE_JWT_ALLOW_HS256') ?? '')
          .trim()
          .toLowerCase() === 'true';
      if (alg === 'HS256') {
        if (!allowHs256) {
          return null;
        }
        const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
        if (!secret) return null;
        payload = jwt.verify(t, secret, {
          ...verifyOpts,
          algorithms: ['HS256'],
        }) as typeof payload;
      } else if (alg === 'ES256' || alg === 'RS256') {
        const kid = decoded.header.kid;
        if (!kid) {
          // Asymmetric tokens must declare `kid`; without it we cannot pin
          // the verification key to a specific JWKS entry.
          return null;
        }
        const client = this.getJwksClient();
        let signingKey: string;
        try {
          signingKey = (await client.getSigningKey(kid)).getPublicKey();
        } catch {
          // Unknown kid (rotation, key removed, or attacker-chosen kid). No
          // fallback to `keys[0]` — that would accept tokens signed with a
          // retired key. No fallback to HS256 — algorithm confusion.
          return null;
        }
        payload = jwt.verify(t, signingKey, {
          ...verifyOpts,
          algorithms: [alg],
        }) as typeof payload;
      } else {
        // `none` and any other algorithms (HS384/HS512/PS256/etc.) are
        // explicitly rejected. The jsonwebtoken library would already reject
        // most via the `algorithms` allowlist, but rejecting here is a
        // stronger contract.
        return null;
      }
      const uid = payload.sub;
      if (!uid) return null;
      return {
        sub: uid,
        email: payload.email ?? '',
        aal: toAal(payload.aal),
        jti: deriveJti(payload),
      };
    } catch {
      return null;
    }
  }

  /** JWT signature valid; returns subject only (no profile DB read). */
  async verifyTokenClaims(token: string | undefined): Promise<TokenClaims | null> {
    if (!token?.trim()) return null;
    return this.verifyJwtPayload(token);
  }

  private async loadProfileAuth(uid: string): Promise<{
    role: UserRole;
    appRole: AppRole;
    permissionScopes: string[];
    accountStatus: 'active' | 'suspended' | 'closed';
  }> {
    const cached = await this.profileAuthCache.get(uid);
    if (cached) {
      return {
        role: cached.role === 'company' ? UserRole.company : UserRole.individual,
        appRole: cached.appRole,
        permissionScopes: cached.permissionScopes,
        accountStatus: cached.accountStatus,
      };
    }
    this.profileAuthCache.recordMiss();
    const { data: profile, error: profileError } = await this.supabase
      .getClient()
      .from('profiles')
      .select('role, app_role, extra_permission_scopes, account_status')
      .eq('id', uid)
      .maybeSingle();
    if (profileError && process.env.NODE_ENV !== 'production') {
      console.warn('[JwtVerifyService] profile lookup failed', profileError.message);
    }
    const row = profile as ProfileRow | null;
    const role = toUserRole(row?.role);
    const appRole = toAppRole(row?.app_role);
    const scopesAppRole = effectiveAppRoleForScopes(appRole, role);
    const extra = Array.isArray(row?.extra_permission_scopes)
      ? row.extra_permission_scopes
      : [];
    const permissionScopes = mergeScopesForUser({
      appRole: scopesAppRole,
      extraScopes: extra,
    });
    const payload = {
      role,
      appRole,
      permissionScopes,
      accountStatus: toAccountStatus(row?.account_status),
    };
    await this.profileAuthCache.set(uid, payload);
    return payload;
  }

  /** Returns current user from Bearer token or null if invalid/missing. */
  async verifyToken(token: string | undefined): Promise<CurrentUser | null> {
    const claims = await this.verifyTokenClaims(token);
    if (!claims) return null;
    const profileAuth = await this.loadProfileAuth(claims.sub);
    return {
      id: claims.sub,
      email: claims.email,
      role: profileAuth.role,
      appRole: profileAuth.appRole,
      permissionScopes: profileAuth.permissionScopes,
      aal: claims.aal,
      accountStatus: profileAuth.accountStatus,
    };
  }
}
