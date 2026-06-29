import { BadRequestException } from '@nestjs/common';
import { AuthSecurityController } from './auth-security.controller';
import { AuthSecurityService } from './auth-security.service';
import { SessionCookieService } from './session/session-cookie.service';
import { AuditService } from '../audit/audit.service';

describe('AuthSecurityController.loginAttempt', () => {
  it('rejects client-reported login success', async () => {
    const controller = new AuthSecurityController(
      {
        requiresCaptchaForLogin: jest.fn(),
        verifyTurnstileToken: jest.fn(),
        getLoginStatus: jest.fn(),
        recordLoginAttempt: jest.fn(),
        isSignupEmailTaken: jest.fn(),
      } as unknown as AuthSecurityService,
      { recordAuthSecurityEvent: jest.fn() } as unknown as AuditService,
      { readCookies: jest.fn() } as unknown as SessionCookieService,
    );
    await expect(
      controller.loginAttempt(
        { email: 'user@test.com', success: true },
        { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('AuthSecurityController.signupEmailStatus', () => {
  it('returns available false when email is taken', async () => {
    const security = {
      verifyTurnstileToken: jest.fn().mockResolvedValue({ ok: true, skipped: true }),
      isSignupEmailTaken: jest.fn().mockResolvedValue(true),
    } as unknown as AuthSecurityService;
    const controller = new AuthSecurityController(
      security,
      { recordAuthSecurityEvent: jest.fn() } as unknown as AuditService,
      { readCookies: jest.fn() } as unknown as SessionCookieService,
    );
    await expect(
      controller.signupEmailStatus({ email: 'taken@test.com' }),
    ).resolves.toEqual({ available: false });
  });

  it('returns available true when email is free', async () => {
    const security = {
      verifyTurnstileToken: jest.fn().mockResolvedValue({ ok: true, skipped: true }),
      isSignupEmailTaken: jest.fn().mockResolvedValue(false),
    } as unknown as AuthSecurityService;
    const controller = new AuthSecurityController(
      security,
      { recordAuthSecurityEvent: jest.fn() } as unknown as AuditService,
      { readCookies: jest.fn() } as unknown as SessionCookieService,
    );
    await expect(
      controller.signupEmailStatus({ email: 'new@test.com' }),
    ).resolves.toEqual({ available: true });
  });
});
