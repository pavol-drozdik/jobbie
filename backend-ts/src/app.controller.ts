import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { SupabaseService } from './supabase/supabase.service';
import { metricsRegistry } from './observability/metrics';
import { timingSafeStringEqual } from './common/timing-safe.util';
import { Public } from './auth/public.decorator';

@Controller()
@Public()
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

  /**
   * Prometheus scrape endpoint.
   *
   * METRICS_BEARER_TOKEN is required in every environment (not only
   * production). Preview / staging deployments inherit prod-like data and
   * leaving the endpoint open in non-production exposes request paths,
   * user counts, and latency histograms for reconnaissance.
   */
  @Get('metrics')
  async metrics(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = this.config.get<string>('METRICS_BEARER_TOKEN')?.trim();
    if (!token) {
      res.status(503).send('Metrics disabled: set METRICS_BEARER_TOKEN');
      return;
    }
    const auth = req.headers.authorization?.trim() ?? '';
    const expected = `Bearer ${token}`;
    if (!timingSafeStringEqual(auth, expected)) {
      res.status(401).send('Unauthorized');
      return;
    }
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  }

  /** Aggregate counts for marketing / home (no auth). */
  @Get('stats/public')
  async publicStats(): Promise<{ workers_looking_for_work: number }> {
    const { count, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('worker_role', true);
    if (error) {
      return { workers_looking_for_work: 0 };
    }
    return { workers_looking_for_work: count ?? 0 };
  }

  /**
   * Returns the Supabase project ref and a quick DB probe. Requires header
   * `x-debug-supabase-secret` matching DEBUG_SUPABASE_PROJECT_SECRET in every
   * environment (used to be open in non-production, which leaked project
   * info from preview / staging deployments).
   */
  @Get('debug/supabase-project')
  async debugSupabaseProject(
    @Req() req: Request,
  ): Promise<{
    projectRef: string;
    urlHost: string;
    profilesReadable: 'ok' | 'no_rows' | 'error';
    message?: string;
  }> {
    const expected = this.config
      .get<string>('DEBUG_SUPABASE_PROJECT_SECRET')
      ?.trim();
    const got =
      typeof req.headers['x-debug-supabase-secret'] === 'string'
        ? req.headers['x-debug-supabase-secret'].trim()
        : '';
    if (!expected || !timingSafeStringEqual(got, expected)) {
      throw new NotFoundException();
    }
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
