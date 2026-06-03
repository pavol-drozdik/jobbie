import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { BearerRecentLoginGuard } from './bearer-recent-login.guard';
import { REQUIRE_RECENT_LOGIN_KEY } from './require-recent-login.decorator';

describe('BearerRecentLoginGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const config = {
    get: jest.fn(() => '120'),
  } as unknown as ConfigService;

  const guard = new BearerRecentLoginGuard(reflector, config);

  function ctxWithToken(token: string | null) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: token ? { authorization: `Bearer ${token}` } : {},
        }),
      }),
    } as never;
  }

  it('allows when recent login not required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(guard.canActivate(ctxWithToken(null))).toBe(true);
  });

  it('rejects missing token when required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(() => guard.canActivate(ctxWithToken(null))).toThrow(ForbiddenException);
  });

  it('allows fresh auth_time', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({ sub: 'u1', auth_time: now }, 'secret');
    expect(guard.canActivate(ctxWithToken(token))).toBe(true);
  });

  it('rejects stale iat', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const stale = Math.floor(Date.now() / 1000) - 60 * 60 * 24;
    const token = jwt.sign({ sub: 'u1', iat: stale }, 'secret');
    expect(() => guard.canActivate(ctxWithToken(token))).toThrow(ForbiddenException);
  });
});
