import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase/supabase.service';

@Controller()
export class AppController {
  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  /** Returns the Supabase project ref and a quick check if the backend can read profiles (service_role bypasses RLS; anon would get 0 rows). */
  @Get('debug/supabase-project')
  async debugSupabaseProject(): Promise<{
    projectRef: string;
    urlHost: string;
    profilesReadable: 'ok' | 'no_rows' | 'error';
    message?: string;
  }> {
    const url = this.config.get<string>('SUPABASE_URL') ?? '';
    const urlHost = url ? new URL(url).hostname : '';
    const projectRef =
      urlHost.endsWith('.supabase.co')
        ? urlHost.replace('.supabase.co', '')
        : urlHost || '(not set)';

    let profilesReadable: 'ok' | 'no_rows' | 'error' = 'no_rows';
    let message: string | undefined;
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('profiles')
        .select('id')
        .limit(1);
      if (error) {
        profilesReadable = 'error';
        message = (error as { message?: string }).message ?? String(error);
      } else if (data && data.length > 0) {
        profilesReadable = 'ok';
      } else {
        message =
          'Backend got 0 rows from profiles. If RLS is on, you must use SUPABASE_SERVICE_ROLE_KEY (not anon key).';
      }
    } catch (e) {
      profilesReadable = 'error';
      message = e instanceof Error ? e.message : String(e);
    }
    return { projectRef, urlHost, profilesReadable, message };
  }
}
