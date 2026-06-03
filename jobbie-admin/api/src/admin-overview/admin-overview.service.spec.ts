import { AdminOverviewService } from './admin-overview.service';

jest.mock('../audit/admin-audit-query.util', () => ({
  buildAuditEventsQuery: jest.fn().mockResolvedValue({ data: [] }),
  fetchActorLabels: jest.fn().mockResolvedValue(new Map()),
}));

function countQuery(count: number) {
  const terminal = jest.fn().mockResolvedValue({ count, data: [] });
  const chain: Record<string, jest.Mock> = {};
  const proxy = new Proxy(chain, {
    get(_t, prop: string) {
      if (prop === 'then') return undefined;
      if (!chain[prop]) {
        chain[prop] = jest.fn().mockReturnValue(proxy);
      }
      return chain[prop];
    },
  });
  chain.gte = jest.fn().mockImplementation(terminal);
  chain.limit = jest.fn().mockImplementation(terminal);
  chain.lt = jest.fn().mockImplementation(terminal);
  return { select: jest.fn().mockReturnValue(proxy) };
}

describe('AdminOverviewService', () => {
  it('maps failed webhook count into overview DTO', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'content_reports') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 4 }),
          }),
        };
      }
      if (table === 'stripe_webhook_events') {
        return countQuery(7);
      }
      return countQuery(1);
    });

    const service = new AdminOverviewService({
      getClient: () => ({ from }),
    } as never);

    const overview = await service.getOverview('actor-1');
    expect(overview.failed_payments_count).toBe(7);
    expect(overview.open_reports_count).toBe(4);
    expect(overview.kpis.signups_today).toBe(1);
  });
});
