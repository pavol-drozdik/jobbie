import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtVerifyService } from './jwt-verify.service';
import { CurrentUser } from './auth.types';

@Injectable()
export class JwksAuthGuard implements CanActivate {
  constructor(private jwtVerify: JwtVerifyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers.authorization;
    const user = await this.jwtVerify.verifyToken(auth);
    if (!user) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    (request as Request & { user: CurrentUser }).user = user;
    return true;
  }
}
