import { SetMetadata } from '@nestjs/common';

export type AdminScope =
  | 'overview'
  | 'analytics'
  | 'audit'
  | 'moderation'
  | 'support'
  | 'billing'
  | 'users'
  | 'notifications'
  | 'blog';

export const ADMIN_SCOPES_KEY = 'admin_scopes';

/** Require desktop admin scopes (after app_role=admin). */
export const RequireAdminScopes = (...scopes: AdminScope[]) =>
  SetMetadata(ADMIN_SCOPES_KEY, scopes);
