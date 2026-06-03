import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './session-auth.guard';

/** Blocks suspended/closed profiles after JWT verify; set via service role only. */
@Injectable()
export class AccountStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>();
    if (!request.user) return true;
    const status = request.user.accountStatus ?? 'active';
    if (status === 'active') return true;
    throw new ForbiddenException(
      status === 'suspended'
        ? 'Account suspended'
        : 'Account closed',
    );
  }
}
