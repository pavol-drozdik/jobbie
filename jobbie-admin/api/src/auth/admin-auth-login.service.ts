import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AdminAuthLoginService {
  private serviceClient: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Service-role client on localhost — bypasses Supabase Auth CAPTCHA (desktop admin only).
   */
  private getServiceClient(): SupabaseClient {
    if (!this.serviceClient) {
      const url = this.config.get<string>('SUPABASE_URL')?.trim();
      const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
      if (!url || !key) {
        throw new ServiceUnavailableException({
          code: 'missing_service_role',
          message: 'SUPABASE_SERVICE_ROLE_KEY missing in api/.env.',
        });
      }
      this.serviceClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.serviceClient;
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number | null;
  }> {
    const { data, error } = await this.getServiceClient().auth.signInWithPassword({
      email: email.trim(),
      password,
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
