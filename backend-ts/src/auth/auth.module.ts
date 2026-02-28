import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwksAuthGuard } from './jwks-auth.guard';
import { JwtVerifyService } from './jwt-verify.service';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [AuthController],
  providers: [JwtVerifyService, JwksAuthGuard, RolesGuard],
  exports: [JwtVerifyService, JwksAuthGuard, RolesGuard],
})
export class AuthModule {}
