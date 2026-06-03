import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PreferenceTokenService } from './preference-token.service';

const SECRET = 'unit-test-notification-preference-token-secret-32';

describe('PreferenceTokenService job alert pause', () => {
  let svc: PreferenceTokenService;

  beforeEach(() => {
    const config = {
      get: (key: string) =>
        key === 'NOTIFICATION_PREFERENCE_TOKEN_SECRET' ? SECRET : undefined,
    } as unknown as ConfigService;
    svc = new PreferenceTokenService(config);
  });

  it('signs and verifies pause token', () => {
    const token = svc.signJobAlertPause('user-1', 'alert-abc');
    expect(token).toBeTruthy();
    const out = svc.verifyJobAlertPause(token!);
    expect(out).toEqual({ userId: 'user-1', alertId: 'alert-abc' });
  });

  it('rejects wrong audience', () => {
    const t = svc.signPreferences('user-1');
    expect(t).toBeTruthy();
    expect(() => svc.verifyJobAlertPause(t!)).toThrow(UnauthorizedException);
  });
});
