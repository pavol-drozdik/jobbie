import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionAuthGuard } from './session-auth.guard';
import { JwtVerifyService } from './jwt-verify.service';
import { SessionCookieService } from './session/session-cookie.service';
import { SessionRevocationService } from './session-revocation.service';
import { CurrentUser, UserRole } from './auth.types';

describe('SessionAuthGuard', () => {
  const mockUser: CurrentUser = {
    id: 'user-1',
    email: 'a@b.c',
    role: UserRole.company,
    appRole: 'employer',
    permissionScopes: [],
    aal: 'aal1',
    accountStatus: 'active',
  };

  let jwtVerify: jest.Mocked<
    Pick<JwtVerifyService, 'verifyToken' | 'verifyTokenClaims'>
  >;
  let cookies: jest.Mocked<Pick<SessionCookieService, 'readCookies'>>;
  let sessionRevocation: jest.Mocked<
    Pick<SessionRevocationService, 'getStatus' | 'invalidate' | 'invalidateAll'>
  >;
  let guard: SessionAuthGuard;

  function contextWithAuth(bearer?: string): {
    ctx: ExecutionContext;
    req: { headers: Record<string, string>; user?: CurrentUser };
  } {
    const req: { headers: Record<string, string>; user?: CurrentUser } = {
      headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
    };
    const ctx = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;
    return { ctx, req };
  }

  beforeEach(() => {
    jwtVerify = {
      verifyToken: jest.fn(),
      verifyTokenClaims: jest.fn(),
    };
    cookies = {
      readCookies: jest.fn().mockReturnValue({
        sessionId: 'sid-1',
        accessToken: 'cookie-jwt',
        refreshToken: null,
        csrfToken: null,
      }),
    };
    sessionRevocation = {
      getStatus: jest.fn().mockResolvedValue({
        userId: 'user-1',
        revoked: false,
        accessTokenJti: null,
      }),
      invalidate: jest.fn(),
      invalidateAll: jest.fn(),
    };
    guard = new SessionAuthGuard(
      jwtVerify as unknown as JwtVerifyService,
      cookies as unknown as SessionCookieService,
      sessionRevocation as unknown as SessionRevocationService,
    );
  });

  it('authenticates with cookie only', async () => {
    cookies.readCookies.mockReturnValue({
      sessionId: 'sid-1',
      accessToken: 'cookie-jwt',
      refreshToken: null,
      csrfToken: null,
    });
    jwtVerify.verifyToken.mockResolvedValue(mockUser);
    const { ctx, req } = contextWithAuth();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user?.id).toBe('user-1');
    expect(jwtVerify.verifyToken).toHaveBeenCalledWith('cookie-jwt');
  });

  it('authenticates with bearer only', async () => {
    cookies.readCookies.mockReturnValue({
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      csrfToken: null,
    });
    jwtVerify.verifyToken.mockResolvedValue(mockUser);
    const { ctx, req } = contextWithAuth('bearer-jwt');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user?.id).toBe('user-1');
  });

  it('prefers cookie when jb_sid is present and bearer matches same user', async () => {
    jwtVerify.verifyToken.mockImplementation(async (token) => {
      if (token === 'fresh-bearer') return mockUser;
      if (token === 'cookie-jwt') return mockUser;
      return null;
    });
    const { ctx, req } = contextWithAuth('fresh-bearer');
    await guard.canActivate(ctx);
    expect(req.user?.id).toBe('user-1');
    expect(jwtVerify.verifyToken).toHaveBeenCalledWith('cookie-jwt');
  });

  it('rejects when bearer and cookie identify different users with jb_sid', async () => {
    jwtVerify.verifyToken.mockImplementation(async (token) => {
      if (token === 'fresh-bearer') {
        return { ...mockUser, id: 'other-user' };
      }
      if (token === 'cookie-jwt') return mockUser;
      return null;
    });
    const { ctx } = contextWithAuth('fresh-bearer');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falls back to cookie when bearer is invalid', async () => {
    jwtVerify.verifyToken.mockImplementation(async (token) => {
      if (token === 'bad-bearer') return null;
      if (token === 'cookie-jwt') return mockUser;
      return null;
    });
    const { ctx, req } = contextWithAuth('bad-bearer');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user?.id).toBe('user-1');
  });

  it('uses bearer when cookie is invalid but bearer is valid (no jb_sid)', async () => {
    cookies.readCookies.mockReturnValue({
      sessionId: null,
      accessToken: 'cookie-jwt',
      refreshToken: null,
      csrfToken: null,
    });
    jwtVerify.verifyToken.mockImplementation(async (token) => {
      if (token === 'fresh-bearer') return { ...mockUser, id: 'user-bearer' };
      return null;
    });
    jwtVerify.verifyTokenClaims.mockResolvedValue({
      sub: 'user-bearer',
      email: 'a@b.c',
      aal: 'aal1',
      jti: 'jti-bearer',
    });
    const { ctx, req } = contextWithAuth('fresh-bearer');
    await guard.canActivate(ctx);
    expect(req.user?.id).toBe('user-bearer');
  });

  it('throws when both bearer and cookie are invalid', async () => {
    jwtVerify.verifyToken.mockResolvedValue(null);
    const { ctx } = contextWithAuth('bad-bearer');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when session is revoked', async () => {
    jwtVerify.verifyToken.mockResolvedValue(mockUser);
    sessionRevocation.getStatus.mockResolvedValue({
      userId: 'user-1',
      revoked: true,
      accessTokenJti: null,
    });
    const { ctx } = contextWithAuth();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when bound access_token_jti does not match the presented token', async () => {
    jwtVerify.verifyToken.mockResolvedValue(mockUser);
    jwtVerify.verifyTokenClaims.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.c',
      aal: 'aal1',
      jti: 'jti-old',
    });
    sessionRevocation.getStatus.mockResolvedValue({
      userId: 'user-1',
      revoked: false,
      accessTokenJti: 'jti-new',
    });
    const { ctx } = contextWithAuth();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when session row userId does not match the verified token', async () => {
    jwtVerify.verifyToken.mockResolvedValue(mockUser);
    sessionRevocation.getStatus.mockResolvedValue({
      userId: 'user-other',
      revoked: false,
      accessTokenJti: null,
    });
    const { ctx } = contextWithAuth();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
