import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type AdminUserSearchItemDto = {
  readonly id: string;
  readonly email: string | null;
  readonly display_name: string | null;
  readonly company_name: string | null;
  readonly app_role: string | null;
  readonly account_status: string | null;
  readonly created_at: string;
};

export type AdminUserDetailDto = AdminUserSearchItemDto & {
  readonly credits: number;
  readonly last_sign_in_at: string | null;
};

@Injectable()
export class AdminUsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async searchUsers(
    query: string,
    limit: number,
  ): Promise<AdminUserSearchItemDto[]> {
    const q = query.trim();
    if (!q) return [];
    const client = this.supabase.getClient();
    const cap = Math.min(Math.max(limit, 1), 50);
    const items: AdminUserSearchItemDto[] = [];
    const seen = new Set<string>();

    const pushProfile = async (profileId: string) => {
      if (seen.has(profileId)) return;
      const row = await this.fetchProfileRow(profileId);
      if (!row) return;
      seen.add(profileId);
      items.push(row);
    };

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(q)) {
      await pushProfile(q);
      if (items.length >= cap) return items.slice(0, cap);
    }

    if (q.includes('@')) {
      try {
        const adminApi = client.auth.admin as {
          getUserByEmail?: (email: string) => Promise<{
            data: { user?: { id: string } | null };
          }>;
        };
        if (typeof adminApi.getUserByEmail === 'function') {
          const { data: authUser } = await adminApi.getUserByEmail(q);
          if (authUser?.user?.id) {
            await pushProfile(authUser.user.id);
          }
        }
      } catch {
        /* email lookup optional */
      }
      if (items.length >= cap) return items.slice(0, cap);
    }

    const escaped = q.replace(/[%_,]/g, '');
    const { data: profiles } = await client
      .from('profiles')
      .select(
        'id, display_name, company_name, app_role, account_status, created_at',
      )
      .or(
        `display_name.ilike.%${escaped}%,company_name.ilike.%${escaped}%`,
      )
      .order('created_at', { ascending: false })
      .limit(cap);

    for (const p of profiles ?? []) {
      const id = String((p as { id: string }).id);
      if (seen.has(id)) continue;
      const email = await this.lookupEmail(id);
      seen.add(id);
      const row = p as {
        id: string;
        display_name?: string | null;
        company_name?: string | null;
        app_role?: string | null;
        account_status?: string | null;
        created_at?: string;
      };
      items.push({
        id: row.id,
        email,
        display_name: row.display_name ?? null,
        company_name: row.company_name ?? null,
        app_role: row.app_role ?? null,
        account_status: row.account_status ?? null,
        created_at: String(row.created_at ?? ''),
      });
      if (items.length >= cap) break;
    }

    return items.slice(0, cap);
  }

  async getUserDetail(id: string): Promise<AdminUserDetailDto> {
    const client = this.supabase.getClient();
    const { data: profile, error } = await client
      .from('profiles')
      .select(
        'id, display_name, company_name, app_role, account_status, created_at, credits',
      )
      .eq('id', id)
      .maybeSingle();
    if (error || !profile) {
      throw new NotFoundException('User not found');
    }
    const row = profile as {
      id: string;
      display_name?: string | null;
      company_name?: string | null;
      app_role?: string | null;
      account_status?: string | null;
      created_at?: string;
      credits?: number | null;
    };
    const { data: authData } = await client.auth.admin.getUserById(id);
    const lastSignIn = authData?.user?.last_sign_in_at ?? null;
    const email = authData?.user?.email ?? (await this.lookupEmail(id));

    return {
      id: row.id,
      email: email ?? null,
      display_name: row.display_name ?? null,
      company_name: row.company_name ?? null,
      app_role: row.app_role ?? null,
      account_status: row.account_status ?? null,
      created_at: String(row.created_at ?? ''),
      credits: typeof row.credits === 'number' ? row.credits : Number(row.credits) || 0,
      last_sign_in_at: lastSignIn,
    };
  }

  private async fetchProfileRow(
    id: string,
  ): Promise<AdminUserSearchItemDto | null> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('profiles')
      .select(
        'id, display_name, company_name, app_role, account_status, created_at',
      )
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    const row = data as {
      id: string;
      display_name?: string | null;
      company_name?: string | null;
      app_role?: string | null;
      account_status?: string | null;
      created_at?: string;
    };
    return {
      id: row.id,
      email: await this.lookupEmail(id),
      display_name: row.display_name ?? null,
      company_name: row.company_name ?? null,
      app_role: row.app_role ?? null,
      account_status: row.account_status ?? null,
      created_at: String(row.created_at ?? ''),
    };
  }

  private async lookupEmail(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .getClient()
      .auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  }
}
