import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'permission_scopes';

/** Require at least one of these permission scopes (see scopes.ts). */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(SCOPES_KEY, scopes);
