import { ForbiddenException } from '@nestjs/common';
import { JobAlertsService } from './job-alerts.service';

function makeService(profileRow: Record<string, unknown> | null, err: Error | null = null) {
  const supabase = {
    getClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: err ? null : profileRow,
              error: err,
            }),
          }),
        }),
      }),
    }),
  };
  const consentEvents = { record: async () => undefined };
  return new JobAlertsService(
    supabase as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    consentEvents as never,
  );
}

describe('JobAlertsService.assertJobSeeker', () => {
  it('throws when company without worker_role', async () => {
    const svc = makeService({
      role: 'company',
      worker_role: false,
      is_deleted: false,
    });
    await expect(svc.assertJobSeeker('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows company with worker_role', async () => {
    const svc = makeService({
      role: 'company',
      worker_role: true,
      is_deleted: false,
    });
    await expect(svc.assertJobSeeker('u1')).resolves.toBeUndefined();
  });

  it('allows individual', async () => {
    const svc = makeService({
      role: 'individual',
      worker_role: false,
      is_deleted: false,
    });
    await expect(svc.assertJobSeeker('u1')).resolves.toBeUndefined();
  });

  it('throws when profile missing', async () => {
    const svc = makeService(null);
    await expect(svc.assertJobSeeker('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when deleted', async () => {
    const svc = makeService({
      role: 'individual',
      worker_role: false,
      is_deleted: true,
    });
    await expect(svc.assertJobSeeker('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
