import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthSecurityController } from './auth-security.controller';
import { JwksAuthGuard } from './jwks-auth.guard';
import { OptionalJwksAuthGuard } from './optional-jwks-auth.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { JwtVerifyService } from './jwt-verify.service';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { AppRoleGuard } from './app-role.guard';
import { AuthSecurityService } from './auth-security.service';
import { GlobalAuthGuard } from './global-auth.guard';
import { CsrfGuard } from './csrf.guard';
import { AccountStatusGuard } from './account-status.guard';
import { AdminMfaGuard } from './admin-mfa.guard';
import { RecentLoginGuard } from './recent-login.guard';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';
import { SessionCookieService } from './session/session-cookie.service';
import { ProfileAuthCacheService } from './profile-auth-cache.service';
import { SessionRevocationService } from './session-revocation.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [forwardRef(() => AuditModule), RedisModule],
  controllers: [
    AuthController,
    AuthSecurityController,
    SessionController,
  ],
  providers: [
    JwtVerifyService,
    ProfileAuthCacheService,
    SessionRevocationService,
    JwksAuthGuard,
    SessionAuthGuard,
    OptionalJwksAuthGuard,
    RolesGuard,
    PermissionsGuard,
    AppRoleGuard,
    AuthSecurityService,
    GlobalAuthGuard,
    SessionService,
    SessionCookieService,
    CsrfGuard,
    AccountStatusGuard,
    AdminMfaGuard,
    RecentLoginGuard,
    {
      provide: APP_GUARD,
      useClass: AccountStatusGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminMfaGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RecentLoginGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
  exports: [
    JwtVerifyService,
    ProfileAuthCacheService,
    SessionRevocationService,
    JwksAuthGuard,
    SessionAuthGuard,
    OptionalJwksAuthGuard,
    RolesGuard,
    PermissionsGuard,
    AppRoleGuard,
    AuthSecurityService,
    GlobalAuthGuard,
    SessionService,
    SessionCookieService,
  ],
})
export class AuthModule {}
