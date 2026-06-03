import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_ROLES_KEY } from './app-roles.decorator';
import type { AppRole } from './auth.types';
import { CurrentUser } from './auth.types';

/** @RequireAppRoles — admin/employer/freelancer; complements profiles.role, not a replacement. */
@Injectable()
export class AppRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<AppRole[]>(APP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;
    const request = context.switchToHttp().getRequest<
      { user: CurrentUser } & Record<string, unknown>
    >();
    const role = request.user?.appRole;
    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException('Insufficient application role');
    }
    return true;
  }
}
