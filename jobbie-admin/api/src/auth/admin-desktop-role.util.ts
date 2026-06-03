export type AdminDesktopRole = 'super_admin' | 'moderator' | 'analyst';

/**
 * Desktop admin RBAC for profiles with app_role=admin.
 * - null / super_admin → full super_admin scopes
 * - moderator → moderation + support (no billing/analytics)
 * - analyst → read-only overview/analytics/audit (explicit downgrade only)
 *
 * app_role=admin without a valid admin_role column value defaults to super_admin.
 */
export function resolveAdminDesktopRole(
  appRole: string | null | undefined,
  adminRole: AdminDesktopRole | null | undefined,
): AdminDesktopRole {
  if (appRole !== 'admin') {
    return 'analyst';
  }
  if (adminRole === 'moderator') {
    return 'moderator';
  }
  if (adminRole === 'analyst') {
    return 'analyst';
  }
  return 'super_admin';
}
