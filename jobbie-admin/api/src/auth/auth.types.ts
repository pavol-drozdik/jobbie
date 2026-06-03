export enum UserRole {
  company = 'company',
  individual = 'individual',
}

export type AppRole = 'user' | 'employer' | 'freelancer' | 'admin';

export type AuthenticatorAssuranceLevel = 'aal1' | 'aal2' | null;

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  appRole: AppRole;
  permissionScopes: readonly string[];
  /** From Supabase JWT `aal` claim when present. */
  aal: AuthenticatorAssuranceLevel;
  accountStatus: 'active' | 'suspended' | 'closed';
}

export type RequestAuthContext = {
  user: CurrentUser | null;
  sessionId: string | null;
};
