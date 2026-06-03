import { resolveAdminDesktopRole } from './admin-desktop-role.util';

describe('resolveAdminDesktopRole', () => {
  it('defaults app admin without admin_role to super_admin', () => {
    expect(resolveAdminDesktopRole('admin', null)).toBe('super_admin');
    expect(resolveAdminDesktopRole('admin', undefined)).toBe('super_admin');
  });

  it('honours explicit analyst and moderator', () => {
    expect(resolveAdminDesktopRole('admin', 'analyst')).toBe('analyst');
    expect(resolveAdminDesktopRole('admin', 'moderator')).toBe('moderator');
  });

  it('returns analyst for non-admin app roles', () => {
    expect(resolveAdminDesktopRole('employer', null)).toBe('analyst');
  });
});
