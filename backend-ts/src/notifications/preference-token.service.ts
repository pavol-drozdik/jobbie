import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export type PreferenceTokenPayload = {
  sub: string;
  aud: 'jobbie-preferences' | 'jobbie-unsubscribe' | 'jobbie-job-alert-pause';
  cat?: string;
  alert_id?: string;
};

@Injectable()
export class PreferenceTokenService {
  constructor(private config: ConfigService) {}

  private getSecret(): string | null {
    return this.config.get<string>('NOTIFICATION_PREFERENCE_TOKEN_SECRET')?.trim() || null;
  }

  signPreferences(userId: string): string | null {
    const s = this.getSecret();
    if (!s) {
      return null;
    }
    return jwt.sign({ sub: userId, aud: 'jobbie-preferences' } satisfies PreferenceTokenPayload, s, {
      expiresIn: '365d',
    });
  }

  signUnsubscribe(userId: string, category: string): string | null {
    const s = this.getSecret();
    if (!s) {
      return null;
    }
    return jwt.sign(
      { sub: userId, aud: 'jobbie-unsubscribe', cat: category } satisfies PreferenceTokenPayload,
      s,
      { expiresIn: '365d' },
    );
  }

  signJobAlertPause(userId: string, alertId: string): string | null {
    const secret = this.getSecret();
    if (!secret) {
      return null;
    }
    return jwt.sign(
      {
        sub: userId,
        aud: 'jobbie-job-alert-pause',
        alert_id: alertId,
      } satisfies PreferenceTokenPayload,
      secret,
      { expiresIn: '90d' },
    );
  }

  verifyJobAlertPause(token: string): { userId: string; alertId: string } {
    const p = this.verify(token);
    if (p.aud !== 'jobbie-job-alert-pause') {
      throw new UnauthorizedException('Invalid token audience');
    }
    const alertId = typeof p.alert_id === 'string' ? p.alert_id.trim() : '';
    if (!alertId) {
      throw new UnauthorizedException('Invalid token');
    }
    return { userId: p.sub, alertId };
  }

  verify(token: string): PreferenceTokenPayload {
    const s = this.getSecret();
    if (!s) {
      throw new UnauthorizedException('Preference tokens are not configured');
    }
    try {
      const p = jwt.verify(token, s) as PreferenceTokenPayload;
      if (typeof p.sub !== 'string' || !p.aud) {
        throw new UnauthorizedException('Invalid token');
      }
      return p;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
