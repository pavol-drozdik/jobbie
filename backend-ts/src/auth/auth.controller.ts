import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from './current-user.decorator';
import { CurrentUser } from './auth.types';
import { PermissionsGuard } from './permissions.guard';
import { RequireScopes } from './scopes.decorator';

/** User from GlobalAuthGuard (SessionAuthGuard): BFF cookie or Bearer. */
@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUserDecorator() user: CurrentUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      app_role: user.appRole,
      permission_scopes: user.permissionScopes,
    };
  }

  @Get('scope-check')
  @UseGuards(PermissionsGuard)
  @RequireScopes('profile:read')
  scopeCheck() {
    return { ok: true, profile_read: true };
  }
}
