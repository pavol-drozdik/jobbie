import { ForbiddenException } from '@nestjs/common';
import {
  assertProfileActivityFromRow,
  ProfileActivityAuthorizationService,
} from './profile-activity-authorization.service';

describe('assertProfileActivityFromRow', () => {
  it('allows customer when customer_role is true', () => {
    expect(() =>
      assertProfileActivityFromRow(
        { customer_role: true, worker_role: false, provider_role: false },
        'customer',
      ),
    ).not.toThrow();
  });

  it('denies customer without customer_role', () => {
    expect(() =>
      assertProfileActivityFromRow({ customer_role: false }, 'customer'),
    ).toThrow(ForbiddenException);
  });

  it('denies customer for company without customer_role', () => {
    expect(() =>
      assertProfileActivityFromRow(
        { customer_role: false, worker_role: false },
        'customer',
      ),
    ).toThrow(ForbiddenException);
  });

  it('requires worker_role for worker activity', () => {
    expect(() =>
      assertProfileActivityFromRow({ worker_role: false }, 'worker'),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertProfileActivityFromRow({ worker_role: true }, 'worker'),
    ).not.toThrow();
  });
});

describe('ProfileActivityAuthorizationService', () => {
  it('loads profile and asserts customer role', async () => {
    const supabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { customer_role: true, worker_role: false, provider_role: false },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    const svc = new ProfileActivityAuthorizationService(supabase as never);
    await expect(svc.assertActivityRole('u1', 'customer')).resolves.toBeUndefined();
  });
});
