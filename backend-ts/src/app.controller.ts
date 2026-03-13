import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { SupabaseService } from './supabase/supabase.service';

@Controller()
export class AppController {
  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {}

  @Get('thanks')
  thanks(
    @Query('credits') credits: string,
    @Res() res: Response,
  ): void {
    const isSuccess = credits === 'success';
    const title = isSuccess
      ? 'Platba prebehla úspešne'
      : 'Platba zrušená';
    const message = isSuccess
      ? 'Ďakujeme. Kredity boli pridané na váš účet. Túto stránku môžete zavrieť a vrátiť sa do aplikácie.'
      : 'Platba bola zrušená. Túto stránku môžete zavrieť a vrátiť sa do aplikácie.';
    const html = `<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 1rem; text-align: center; }
    h1 { font-size: 1.25rem; color: #111; }
    p { color: #444; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
</body>
</html>`;
    res.type('html').send(html);
  }

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
