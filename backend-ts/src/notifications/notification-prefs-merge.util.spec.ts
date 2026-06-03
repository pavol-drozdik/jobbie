import {
  legacyToNotificationPrefsV2,
  mergeNotificationPreferences,
  serializeNotificationPreferencesForClient,
} from './notification-prefs-merge.util';

describe('notification-prefs-merge.util', () => {
  it('converts legacy booleans to v2 categories', () => {
    const v2 = legacyToNotificationPrefsV2({
      messages: false,
      new_applications: true,
      reviews: false,
    });
    expect(v2.v).toBe(2);
    expect(v2.categories.messages?.email).toBe(false);
    expect(v2.categories.applications?.email).toBe(true);
    expect(v2.categories.reviews?.push).toBe(false);
  });

  it('merges v2 partial without dropping other categories', () => {
    const existing = {
      v: 2,
      categories: {
        messages: { in_app: true, email: false, push: true, sms: false },
        marketing: { in_app: false, email: false, push: false, sms: false },
      },
    };
    const next = mergeNotificationPreferences(existing, {
      v: 2,
      categories: {
        messages: { email: true },
      },
    });
    expect(next.categories.messages?.email).toBe(true);
    expect(next.categories.messages?.in_app).toBe(true);
    expect(next.categories.marketing?.in_app).toBe(false);
    expect(next.categories.applications).toBeDefined();
  });

  it('serialize round-trips stored v2', () => {
    const stored = {
      v: 2,
      categories: {
        payments: { in_app: true, email: false, push: true, sms: false },
      },
    };
    const out = serializeNotificationPreferencesForClient(stored);
    expect(out.v).toBe(2);
    expect(out.categories.payments?.email).toBe(false);
  });
});
