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

const CACHE_TTL_MS = 5 * 60 * 1000;

type ProfileRow = {
  role: string;
  app_role: string | null;
  extra_permission_scopes: string[] | null;
  account_status: string | null;
};

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
  ) {}

  private getJwksClient(): JwksClient {
    if (!this.jwksClient) {
      const url = this.config.get<string>('SUPABASE_URL');
      if (!url) throw new Error('Supabase URL not configured');
      const jwksUrl =
        url.replace(/\/$/, '') + '/auth/v1/.well-known/jwks.json';
      this.jwksClient = new JwksClient({
        jwksUri: jwksUrl,
        cache: true,
        cacheMaxAge: CACHE_TTL_MS,
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

  /** Returns current user from Bearer token or null if invalid/missing. */
  async verifyToken(token: string | undefined): Promise<CurrentUser | null> {
    if (!token?.trim()) return null;
    const t = token.startsWith('Bearer ') ? token.slice(7) : token;
    try {
      const decoded = jwt.decode(t, { complete: true }) as
        | { header: { kid?: string; alg?: string }; payload: unknown }
        | null;
      const verifyOpts = this.jwtVerifyOptions();
      let payload: { sub?: string; email?: string; aal?: string };
      const alg = decoded?.header?.alg;
      if (alg === 'HS256') {
        const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
        if (!secret) return null;
        payload = jwt.verify(t, secret, {
          ...verifyOpts,
          algorithms: ['HS256'],
        }) as typeof payload;
      } else {
        const client = this.getJwksClient();
        const kid = decoded?.header?.kid;
        let signingKey: string | null = null;
        if (kid) {
          try {
            signingKey = (await client.getSigningKey(kid)).getPublicKey();
          } catch {
            /* try fallback key below */
          }
        }
        if (!signingKey) {
          const keys = await client.getSigningKeys();
          if (keys.length > 0) {
            signingKey = keys[0].getPublicKey();
          }
        }
        if (!signingKey) {
          const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
          if (!secret) return null;
          payload = jwt.verify(t, secret, {
            ...verifyOpts,
            algorithms: ['HS256'],
          }) as typeof payload;
        } else {
          payload = jwt.verify(t, signingKey, {
            ...verifyOpts,
            algorithms: ['ES256', 'RS256'],
          }) as typeof payload;
        }
      }
      const uid = payload.sub;
      const email = payload.email ?? '';
      if (!uid) return null;
      // app_role / extra_permission_scopes are service-role writable only — never trust client claims.
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
      return {
        id: uid,
        email,
        role,
        appRole,
        permissionScopes,
        aal: toAal(payload.aal),
        accountStatus: toAccountStatus(row?.account_status),
      };
    } catch {
      return null;
    }
  }
}
