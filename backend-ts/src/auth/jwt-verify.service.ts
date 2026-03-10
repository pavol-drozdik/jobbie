import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentUser, UserRole } from './auth.types';

const CACHE_TTL_MS = 5 * 60 * 1000;

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

  /** Returns current user from Bearer token or null if invalid/missing. */
  async verifyToken(token: string | undefined): Promise<CurrentUser | null> {
    if (!token?.trim()) return null;
    const t = token.startsWith('Bearer ') ? token.slice(7) : token;
    try {
      const client = this.getJwksClient();
      const decoded = jwt.decode(t, { complete: true }) as
        | { header: { kid?: string }; payload: unknown }
        | null;
      const kid = decoded?.header?.kid;
      const key = kid ? await client.getSigningKey(kid) : null;
      const signingKey = key?.getPublicKey();
      if (!signingKey) return null;
      const payload = jwt.verify(t, signingKey, {
        algorithms: ['ES256'],
      }) as { sub?: string; email?: string };
      const uid = payload.sub;
      const email = payload.email ?? '';
      if (!uid) return null;
      const { data: profile } = await this.supabase
        .getClient()
        .from('profiles')
        .select('role, looking_for_work, offering_work')
        .eq('id', uid)
        .single();
      const role =
        profile?.role === 'individual' ? UserRole.individual : UserRole.company;
      const looking_for_work = Boolean((profile as { looking_for_work?: boolean })?.looking_for_work);
      const offering_work = Boolean((profile as { offering_work?: boolean })?.offering_work);
      return { id: uid, email, role, looking_for_work, offering_work };
    } catch {
      return null;
    }
  }
}
