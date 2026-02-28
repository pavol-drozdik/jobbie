import { SetMetadata } from '@nestjs/common';
import { UserRole } from './auth.types';
import { ROLES_KEY } from './roles.guard';

export const RequireCompany = () => SetMetadata(ROLES_KEY, [UserRole.company]);
export const RequireIndividual = () =>
  SetMetadata(ROLES_KEY, [UserRole.individual]);
