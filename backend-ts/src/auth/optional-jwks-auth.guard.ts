import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtVerifyService } from './jwt-verify.service';
import { CurrentUser } from './auth.types';

/**
 * Like JwksAuthGuard but does not throw when token is missing or invalid.
 * Sets request.user to CurrentUser when token is valid, otherwise null.
 * Use for GET /jobs list so unauthenticated users get default sort.
 */
@Injectable()
export class OptionalJwksAuthGuard implements CanActivate {
  constructor(private jwtVerify: JwtVerifyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers.authorization;
    const user = await this.jwtVerify.verifyToken(auth);
    (request as Request & { user: CurrentUser | null }).user = user ?? null;
    return true;
  }
}
