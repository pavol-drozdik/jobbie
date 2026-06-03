import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtVerifyService } from './jwt-verify.service';
import { CurrentUser } from './auth.types';
import type { AuthenticatedRequest } from './session-auth.guard';

/**
 * Legacy route guard — defers to {@link SessionAuthGuard} when `request.user` is
 * already set (BFF HttpOnly cookies). Otherwise requires `Authorization: Bearer`.
 */
@Injectable()
export class JwksAuthGuard implements CanActivate {
  constructor(private jwtVerify: JwtVerifyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authed = request as AuthenticatedRequest;
    if (authed.user?.id) {
      return true;
    }
    const auth = request.headers.authorization;
    const user = await this.jwtVerify.verifyToken(
      typeof auth === 'string' ? auth : undefined,
    );
    if (!user) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    authed.user = user;
    return true;
  }
}
