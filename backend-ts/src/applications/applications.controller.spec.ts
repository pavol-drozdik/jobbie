import { ForbiddenException } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { CurrentUser, UserRole } from '../auth/auth.types';

type EqCall = { column: string; value: unknown };

function makeController() {
  const eqCalls: EqCall[] = [];

  // The PostgREST chain returned by `.from('applications').select(...)` is
  // awaited as a thenable (returns `{ data, error }`). We mock that by giving
  // the chain a `then` property that resolves to an empty result set.
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.range = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockImplementation((column: string, value: unknown) => {
    eqCalls.push({ column, value });
    return chain;
  });
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.then = (resolve: (v: { data: unknown[] }) => unknown): unknown =>
    resolve({ data: [] });

  const client = { from: jest.fn().mockReturnValue(chain) };
  const supabase = { getClient: () => client } as unknown as {
    getClient: () => typeof client;
  };
  const feed = { invalidateEngagement: jest.fn() } as unknown as {
    invalidateEngagement: jest.Mock;
  };

  const controller = new ApplicationsController(
    supabase as never,
    feed as never,
  );

  return { controller, eqCalls };
}

const userA: CurrentUser = {
  id: 'user-A',
  email: 'a@example.com',
  role: UserRole.individual,
  appRole: 'user',
  permissionScopes: [],
  aal: 'aal1',
  accountStatus: 'active',
};

describe('ApplicationsController.list IDOR scoping', () => {
  it('defaults to individual_id = user.id when no filter is provided', async () => {
    const { controller, eqCalls } = makeController();

    await controller.list(userA, undefined, undefined, 50, 0);

    expect(eqCalls).toContainEqual({
      column: 'individual_id',
      value: 'user-A',
    });
  });

  it('throws when individualId does not match user.id', async () => {
    const { controller } = makeController();

    await expect(
      controller.list(userA, undefined, 'someone-else', 50, 0),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not scope by individual_id when a job_id filter is supplied (job-owner branch)', async () => {
    // For the job-owner branch the controller calls `from('job_offers')`
    // (single row) BEFORE the main `from('applications')` chain. We capture
    // calls separately per-table so the same mock works for both.
    const eqCalls: EqCall[] = [];
    const appsChain: Record<string, unknown> = {};
    appsChain.select = jest.fn().mockReturnValue(appsChain);
    appsChain.order = jest.fn().mockReturnValue(appsChain);
    appsChain.range = jest.fn().mockReturnValue(appsChain);
    appsChain.eq = jest
      .fn()
      .mockImplementation((column: string, value: unknown) => {
        eqCalls.push({ column, value });
        return appsChain;
      });
    appsChain.then = (resolve: (v: { data: unknown[] }) => unknown): unknown =>
      resolve({ data: [] });

    const jobChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: { company_id: 'user-A' }, error: null }),
    };

    const client = {
      from: jest.fn().mockImplementation((table: string) =>
        table === 'job_offers' ? jobChain : appsChain,
      ),
    };
    const supabase = { getClient: () => client } as unknown as {
      getClient: () => typeof client;
    };
    const feed = { invalidateEngagement: jest.fn() } as unknown as {
      invalidateEngagement: jest.Mock;
    };
    const controller = new ApplicationsController(
      supabase as never,
      feed as never,
    );

    await controller.list(userA, 'job-1', undefined, 50, 0);

    expect(eqCalls).toContainEqual({ column: 'job_id', value: 'job-1' });
    expect(
      eqCalls.find((c) => c.column === 'individual_id'),
    ).toBeUndefined();
  });
});
