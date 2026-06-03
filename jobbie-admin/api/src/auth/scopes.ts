import type { AppRole } from './auth.types';
import { UserRole } from './auth.types';

/** Default permission scopes per primary app role (wildcard segments use `*`). */
export const DEFAULT_SCOPES_BY_ROLE: Readonly<
  Record<AppRole, readonly string[]>
> = {
  user: ['profile:read', 'profile:write', 'jobs:read', 'chat:read'],
  freelancer: [
    'profile:read',
    'profile:write',
    'jobs:read',
    'jobs:apply',
    'chat:*',
    'applications:self',
  ],
  employer: [
    'profile:read',
    'profile:write',
    'jobs:*',
    'applications:*',
    'company:*',
    'billing:*',
    'chat:*',
  ],
  admin: ['*'],
};

/**
 * Maps legacy `profiles.role` to RBAC when `app_role` was never set (still `user`).
 * Matches backfill in `20260503120000_enterprise_auth_security.sql`.
 */
export function effectiveAppRoleForScopes(
  appRole: AppRole,
  profileRole: UserRole,
): AppRole {
  if (appRole === 'admin' || appRole === 'employer' || appRole === 'freelancer') {
    return appRole;
  }
  if (profileRole === UserRole.company) return 'employer';
  if (profileRole === UserRole.individual) return 'freelancer';
  return appRole;
}

export function mergeScopesForUser(input: {
  appRole: AppRole;
  extraScopes: readonly string[];
}): string[] {
  const base = [...DEFAULT_SCOPES_BY_ROLE[input.appRole]];
  const extra = input.extraScopes.filter(Boolean);
  const combined = new Set([...base, ...extra]);
  return Array.from(combined);
}

/** Returns true if the user holds the required scope (supports `ns:*` wildcards). */
export function hasPermissionScope(
  userScopes: readonly string[],
  required: string,
): boolean {
  if (userScopes.includes('*')) return true;
  if (userScopes.includes(required)) return true;
  const colon = required.indexOf(':');
  if (colon === -1) return userScopes.includes(required);
  const ns = required.slice(0, colon);
  return userScopes.includes(`${ns}:*`);
}
