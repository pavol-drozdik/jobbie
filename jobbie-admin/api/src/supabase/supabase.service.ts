import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// SECURITY: service_role bypasses RLS — enforce ownership/roles in Nest services, not only in DB policies.
@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly readClient: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    this.client = createClient(url, key);
    const readUrl = this.config.get<string>('SUPABASE_READ_URL')?.trim();
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
