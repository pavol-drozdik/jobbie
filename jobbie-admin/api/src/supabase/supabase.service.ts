import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    const url = normalizeSupabaseUrl(this.config.get<string>('SUPABASE_URL'));
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    this.client = createClient(url, key);
    const readUrl = normalizeSupabaseUrl(this.config.get<string>('SUPABASE_READ_URL'));
    if (readUrl && readUrl !== url) {
      this.readClient = createClient(readUrl, key);
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
