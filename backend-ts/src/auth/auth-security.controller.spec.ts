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
