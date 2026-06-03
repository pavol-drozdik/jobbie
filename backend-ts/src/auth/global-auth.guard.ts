import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from './optional-auth.decorator';
import { SessionAuthGuard } from './session-auth.guard';
import { OptionalJwksAuthGuard } from './optional-jwks-auth.guard';

/**
 * Default-deny auth for HTTP routes unless @Public() or @OptionalAuth().
 * Protected routes use SessionAuthGuard (HttpOnly jb_at cookie, then Bearer fallback).
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private sessionAuth: SessionAuthGuard,
    private optional: OptionalJwksAuthGuard,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
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
    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isOptional) {
      return this.optional.canActivate(context);
    }
    return this.sessionAuth.canActivate(context);
  }
}
