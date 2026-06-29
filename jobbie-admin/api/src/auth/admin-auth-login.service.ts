import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AdminAuthLoginService {
  private anonClient: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  private getAnonClient(): SupabaseClient {
    if (!this.anonClient) {
      const url = this.config.get<string>('SUPABASE_URL')?.trim();
      const key = this.config.get<string>('SUPABASE_ANON_KEY')?.trim();
      if (!url || !key) {
        throw new ServiceUnavailableException({
          code: 'missing_anon_key',
          message:
            'SUPABASE_ANON_KEY missing in api/.env (copy NUXT_PUBLIC_SUPABASE_ANON_KEY from app-pwa/.env — not the service role key).',
        });
      }
      this.anonClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.anonClient;
  }

  async signIn(
    email: string,
    password: string,
    captchaToken?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number | null;
  }> {
    const trimmedCaptcha = captchaToken?.trim()
    const { data, error } = await this.getAnonClient().auth.signInWithPassword({
      email: email.trim(),
      password,
      options: trimmedCaptcha ? { captchaToken: trimmedCaptcha } : undefined,
    });
    if (error) {
      throw new UnauthorizedException({
        code: error.code ?? 'auth_error',
        message: error.message,
      });
    }
    const session = data.session;
    if (!session?.access_token || !session.refresh_token) {
      throw new UnauthorizedException({
        code: 'no_session',
        message: 'Prihlásenie nevrátilo platnú reláciu.',
      });
    }
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in ?? null,
    };
  }
}
