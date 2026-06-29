import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtVerifyService } from './jwt-verify.service';
import { JwksAuthGuard } from './jwks-auth.guard';
import { AppRoleGuard } from './app-role.guard';
import { BearerAuthGuard } from './bearer-auth.guard';
import { BearerRecentLoginGuard } from './bearer-recent-login.guard';
import { AdminScopeGuard } from './admin-scope.guard';
import { AdminAuthLoginController } from './admin-auth-login.controller';
import { AdminAuthLoginService } from './admin-auth-login.service';

@Module({
  controllers: [AdminAuthLoginController],
  providers: [
    JwtVerifyService,
    AdminAuthLoginService,
    JwksAuthGuard,
    AppRoleGuard,
    AdminScopeGuard,
    BearerAuthGuard,
    BearerRecentLoginGuard,
    {
      provide: APP_GUARD,
      useClass: BearerAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BearerRecentLoginGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminScopeGuard,
    },
  ],
  exports: [JwtVerifyService, JwksAuthGuard, AppRoleGuard, AdminScopeGuard],
})
export class AdminAuthModule {}
