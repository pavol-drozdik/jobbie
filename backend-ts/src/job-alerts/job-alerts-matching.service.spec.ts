import { JobAlertsMatchingService } from './job-alerts-matching.service';

describe('JobAlertsMatchingService', () => {
  const makeService = (opts: {
    typesenseIds?: string[];
    typesenseEnabled?: boolean;
    dbRows?: Array<{ id: string; application_deadline?: string | null }>;
  }) => {
    const typesense = {
      isEnabled: () => opts.typesenseEnabled !== false,
      searchJobsTypesense: jest.fn(async () => ({
        ids: opts.typesenseIds ?? [],
        found: opts.typesenseIds?.length ?? 0,
        facetCounts: [],
      })),
    };
    const supabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            in: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({
                    data: opts.dbRows ?? [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    return {
      svc: new JobAlertsMatchingService(supabase as never, typesense as never),
      typesense,
    };
  };

  it('uses relevance sort and returns hydrated count (not raw Typesense found)', async () => {
    const { svc, typesense } = makeService({
      typesenseIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      dbRows: [
        { id: 'a', application_deadline: null },
        { id: 'b', application_deadline: null },
      ],
    });
    const count = await svc.countPublicJobsMatching({
      keywords: 'Preprava',
      employment_types: [],
    });
    expect(count).toBe(2);
    expect(typesense.searchJobsTypesense).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'Preprava',
        sort: 'relevance',
      }),
    );
  });

  it('matchPublicJobIds passes createdAfterTs for dispatch', async () => {
    const { svc, typesense } = makeService({
      typesenseIds: ['j1'],
      dbRows: [{ id: 'j1', application_deadline: null }],
    });
    const ids = await svc.matchPublicJobIds(
      { keywords: 'test', employment_types: [] },
      { createdAfterTs: 1_700_000_000, limit: 50 },
    );
    expect(ids).toEqual(['j1']);
    expect(typesense.searchJobsTypesense).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAfterTs: 1_700_000_000,
        limit: 50,
        sort: 'relevance',
      }),
    );
  });

  it('drops expired jobs after Postgres hydrate', async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const { svc } = makeService({
      typesenseIds: ['live', 'expired'],
      dbRows: [
        { id: 'live', application_deadline: null },
        { id: 'expired', application_deadline: past },
      ],
    });
    const ids = await svc.matchPublicJobIds({
      keywords: 'Preprava',
      employment_types: [],
    });
    expect(ids).toEqual(['live']);
  });

  it('returns empty when Typesense disabled', async () => {
    const { svc } = makeService({ typesenseEnabled: false });
    await expect(
      svc.countPublicJobsMatching({ keywords: 'x', employment_types: [] }),
    ).resolves.toBe(0);
  });

  it('matchPublicJobIdsForDispatch uses created_at sort and bounds', async () => {
    const { svc, typesense } = makeService({
      typesenseIds: ['j1'],
      dbRows: [{ id: 'j1', application_deadline: null }],
    });
    const ids = await svc.matchPublicJobIdsForDispatch(
      { categories: ['stavba'], employment_types: [] },
      { createdAfterTs: 1_700_000_000, createdBeforeTs: 1_800_000_000 },
    );
    expect(ids).toEqual(['j1']);
    expect(typesense.searchJobsTypesense).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAfterTs: 1_700_000_000,
        createdBeforeTs: 1_800_000_000,
        sort: 'created_at',
      }),
    );
  });
});
