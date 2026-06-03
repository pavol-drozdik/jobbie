import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_ROLES_KEY } from './app-roles.decorator';
import { AppRole } from './auth.types';
import { AuthenticatedRequest } from './session-auth.guard';

@Injectable()
export class AdminMfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AppRole[]>(APP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.includes('admin')) {
      return true;
    }
    // SECURITY: Admin routes require Supabase JWT aal2 (MFA verified), not only app_role.
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.aal === 'aal2') {
      return true;
    }
    throw new ForbiddenException('Admin MFA (AAL2) required');
  }
}
