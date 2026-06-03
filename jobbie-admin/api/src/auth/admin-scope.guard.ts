import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';
import type { CurrentUser } from './auth.types';
import { ADMIN_SCOPES_KEY, type AdminScope } from './admin-scope.decorator';
import {
  resolveAdminDesktopRole,
  type AdminDesktopRole,
} from './admin-desktop-role.util';

type AdminRole = AdminDesktopRole;

const ROLE_SCOPES: Record<AdminRole, ReadonlySet<AdminScope>> = {
  super_admin: new Set([
    'overview',
    'analytics',
    'audit',
    'moderation',
    'support',
    'billing',
    'users',
    'notifications',
    'blog',
  ]),
  moderator: new Set([
    'overview',
    'audit',
    'moderation',
    'support',
    'users',
    'notifications',
    'blog',
  ]),
  analyst: new Set(['overview', 'analytics', 'audit']),
};

@Injectable()
export class AdminScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminScope[] | undefined>(
      ADMIN_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: CurrentUser }>();
    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException('Admin scope denied');
    }
    const role = await this.resolveAdminRole(user);
    const allowed = ROLE_SCOPES[role];
    for (const scope of required) {
      if (!allowed.has(scope)) {
        throw new ForbiddenException(`Missing admin scope: ${scope}`);
      }
    }
    return true;
  }

  private isDevFullScopesEnabled(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.ADMIN_DEV_FULL_SCOPES === '1'
    );
  }

  private async resolveAdminRole(user: CurrentUser): Promise<AdminRole> {
    if (this.isDevFullScopesEnabled()) {
      return 'super_admin';
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('admin_role, app_role')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !data) {
      return 'analyst';
    }
    const row = data as {
      admin_role?: AdminRole | null;
      app_role?: string | null;
    };
    const appRole = row.app_role ?? user.appRole;
    return resolveAdminDesktopRole(appRole, row.admin_role ?? null);
  }
}
