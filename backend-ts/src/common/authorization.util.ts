import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser } from '../auth/auth.types';

export function assertAuthenticated(user: CurrentUser | null | undefined): asserts user is CurrentUser {
  if (!user?.id) {
    throw new ForbiddenException('Authentication required');
  }
}

// SECURITY: Return 404 (not 403) so non-owners cannot probe whether a resource id exists.
export function assertResourceOwner(
  userId: string,
  resourceOwnerId: string,
  message = 'Resource not found',
): void {
  if (userId !== resourceOwnerId) {
    throw new NotFoundException(message);
  }
}

// profiles.role — firma account type (IČO, company profile fields), not activity roles.
export function assertCompanyUser(
  user: CurrentUser,
  message = 'Company account required',
): void {
  if (user.role !== 'company') {
    throw new ForbiddenException(message);
  }
}

// Employer CV database / applicants: company profile or app_role employer.
export function assertCompanyOrEmployerRole(
  user: CurrentUser,
  message = 'Employer account required',
): void {
  if (user.role !== 'company' && user.appRole !== 'employer') {
    throw new ForbiddenException(message);
  }
}
