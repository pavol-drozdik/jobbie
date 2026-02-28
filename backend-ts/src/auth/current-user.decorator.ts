import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './auth.types';

export const CurrentUserDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: CurrentUser }>();
    return request.user;
  },
);
