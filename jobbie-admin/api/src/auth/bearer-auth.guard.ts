import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtVerifyService } from './jwt-verify.service';
import type { CurrentUser } from './auth.types';

/** Default-deny Bearer JWT auth for the desktop admin API. */
@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtVerify: JwtVerifyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.jwtVerify.verifyToken(request.headers.authorization);
    if (!user) {
      throw new UnauthorizedException('Missing or invalid Bearer token');
    }
    (request as Request & { user: CurrentUser }).user = user;
    return true;
  }
}
