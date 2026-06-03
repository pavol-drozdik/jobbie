import { UserRole } from './auth.types';
import { effectiveAppRoleForScopes, hasPermissionScope } from './scopes';

describe('effectiveAppRoleForScopes', () => {
  it('maps company profile with generic app_role to employer', () => {
    expect(effectiveAppRoleForScopes('user', UserRole.company)).toBe('employer');
  });

  it('grants jobs:* via employer scopes for company profile', () => {
    const role = effectiveAppRoleForScopes('user', UserRole.company);
    expect(role).toBe('employer');
    expect(hasPermissionScope(['jobs:*'], 'jobs:*')).toBe(true);
  });

  it('keeps explicit employer app_role', () => {
    expect(effectiveAppRoleForScopes('employer', UserRole.company)).toBe('employer');
  });
});
