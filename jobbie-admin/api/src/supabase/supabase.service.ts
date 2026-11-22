import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// supabase-js >= 2.106 builds a Realtime client in createClient() that needs a global
// WebSocket. The packaged desktop app runs the API under Electron's bundled Node 20, which
// has no native WebSocket (added globally in Node 21+/22), so createClient throws
// "Node.js 20 detected without native WebSocket support". Supply the `ws` implementation
// explicitly. `require` (not import) mirrors http-cors.util.ts and avoids needing @types/ws.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeWebSocket = require('ws');

const SUPABASE_CLIENT_OPTIONS = {
  realtime: { transport: NodeWebSocket },
} as const;

/**
 * supabase-js >= 2.106 requires an explicit http(s) scheme (throws
 * "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" otherwise). Secrets are
 * sometimes stored as a bare host (`abcd.supabase.co`), which older versions accepted —
 * normalize so the API boots regardless of how the credential was entered.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  // Strip stray trailing separators (e.g. a comma/semicolon pasted into the secret) and
  // surrounding whitespace before validating — a trailing comma silently breaks every request.
  const value = raw?.trim().replace(/[,;\s]+$/, '');
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

// SECURITY: service_role bypasses RLS — enforce ownership/roles in Nest services, not only in DB policies.
@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly readClient: SupabaseClient;

  constructor(private config: ConfigService) {
    const rawUrl = this.config.get<string>('SUPABASE_URL');
    const url = normalizeSupabaseUrl(rawUrl);
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!url || !key) {
      throw new Error(
        `Admin API config incomplete — SUPABASE_URL=${JSON.stringify(rawUrl)} SERVICE_ROLE_KEY=${key ? 'set' : 'MISSING'}. ` +
          'Fix resources/api.env or %APPDATA%/JOBBIE Admin/.env, then restart.',
      );
    }
    // Fail with an actionable message instead of a cryptic supabase-js stack on a bad URL.
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      throw new Error(
        `SUPABASE_URL is not a valid URL after normalization: ${JSON.stringify(url)} ` +
          `(raw: ${JSON.stringify(rawUrl)}). Expected e.g. https://<ref>.supabase.co`,
      );
    }
    this.client = createClient(url, key, SUPABASE_CLIENT_OPTIONS);
    const readUrl = normalizeSupabaseUrl(this.config.get<string>('SUPABASE_READ_URL'));
    if (readUrl && readUrl !== url) {
      this.readClient = createClient(readUrl, key, SUPABASE_CLIENT_OPTIONS);
    } else {
      this.readClient = this.client;
    }
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  /** Read replica when `SUPABASE_READ_URL` is set; otherwise primary. */
  getReadClient(): SupabaseClient {
    return this.readClient;
  }
}
