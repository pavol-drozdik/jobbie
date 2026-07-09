import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { CurrentUser } from './auth.types';
import {
  resolveAdminDesktopRole,
  type AdminDesktopRole,
} from './admin-desktop-role.util';

@Injectable()
export class AdminRoleService {
  constructor(private readonly supabase: SupabaseService) {}

  async getDesktopRole(user: CurrentUser): Promise<AdminDesktopRole> {
    if (this.isDevFullScopesEnabled()) {
      return 'super_admin';
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('admin_role, app_role')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      if (/admin_role/i.test(error.message)) {
        return resolveAdminDesktopRole(user.appRole, null);
      }
      return 'analyst';
    }
    if (!data) {
      return 'analyst';
    }
    const row = data as {
      admin_role?: AdminDesktopRole | null;
      app_role?: string | null;
    };
    return resolveAdminDesktopRole(
      row.app_role ?? user.appRole,
      row.admin_role ?? null,
    );
  }

  async isSuperAdmin(user: CurrentUser): Promise<boolean> {
    return (await this.getDesktopRole(user)) === 'super_admin';
  }

  private isDevFullScopesEnabled(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.ADMIN_DEV_FULL_SCOPES === '1'
    );
  }
}
