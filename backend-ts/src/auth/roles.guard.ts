import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from './auth.types';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler());
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<{ user: { role: UserRole } }>();
    const user = request.user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException(
        user?.role === UserRole.individual
          ? 'Company account required'
          : 'Individual account required',
      );
    }
    return true;
  }
}
