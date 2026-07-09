import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CurrentUser } from './auth.types';
import { AdminRoleService } from './admin-role.service';
import { REQUIRE_SUPER_ADMIN_KEY } from './require-super-admin.decorator';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminRole: AdminRoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_SUPER_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: CurrentUser }>();
    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException('Super admin required');
    }

    if (!(await this.adminRole.isSuperAdmin(user))) {
      throw new ForbiddenException('Super admin required');
    }
    return true;
  }
}
