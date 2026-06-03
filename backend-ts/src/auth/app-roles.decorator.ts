import { SetMetadata } from '@nestjs/common';
import type { AppRole } from './auth.types';

export const APP_ROLES_KEY = 'app_roles';

/** Require one of these app roles (employer, freelancer, admin, user). */
export const RequireAppRoles = (...roles: AppRole[]) =>
  SetMetadata(APP_ROLES_KEY, roles);
