import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from './scopes.decorator';
import { CurrentUser } from './auth.types';
import { hasPermissionScope } from './scopes';

// SECURITY: UI useCan() is not authoritative — scopes enforced here and in service ownership checks.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>(
      SCOPES_KEY,
      context.getHandler(),
    );
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<
      { user: CurrentUser } & Record<string, unknown>
    >();
    const user = request.user;
    if (!user?.permissionScopes?.length) {
      throw new ForbiddenException('Missing permission scopes');
    }
    const ok = required.some((scope) =>
      hasPermissionScope(user.permissionScopes, scope),
    );
    if (!ok) {
      throw new ForbiddenException('Insufficient permission scope');
    }
    return true;
  }
}
