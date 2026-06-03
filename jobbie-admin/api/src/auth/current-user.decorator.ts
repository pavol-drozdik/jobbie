import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './auth.types';

export const CurrentUserDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser | null => {
    const request = ctx.switchToHttp().getRequest<
      Request & { user: CurrentUser | null }
    >();
    return request.user ?? null;
  },
);
