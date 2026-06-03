import { LocationsService } from './locations.service';
import type { SkRpoLookupService } from '../registry/sk-rpo-lookup.service';
import type { TypesenseService } from '../search/typesense.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { SkSchoolResponseDto } from './locations.dto';

describe('LocationsService.searchSkCompanies', () => {
  type DbRow = {
    id: number;
    rpo_id: number;
    name: string;
    ico: string | null;
    municipality: string | null;
  };

  const dbRows: DbRow[] = [
    {
      id: 1,
      rpo_id: 100,
      name: 'ACME s.r.o.',
      ico: '50881337',
      municipality: 'Bratislava',
    },
  ];

  function makeTypesense(schoolResults: SkSchoolResponseDto[] | null = null) {
    return {
      searchSkSchools: jest.fn(async () => schoolResults),
      isEnabled: jest.fn(() => true),
    } as unknown as TypesenseService;
  }

  function makeService(opts: {
    dbResults?: DbRow[];
    rpoResults?: { id: number; name: string; ico: string | null; municipality: string | null }[];
    typesense?: TypesenseService;
  }) {
    const dbCalls: { fn: string; args: Record<string, unknown> }[] = [];
    const supabase = {
      getReadClient: () => ({
        rpc: jest.fn(async (fn: string, args: Record<string, unknown>) => {
          dbCalls.push({ fn, args });
          if (fn === 'search_sk_companies') {
            return { data: opts.dbResults ?? [], error: null };
          }
          return { data: null, error: null };
        }),
      }),
      getClient: () => ({
        rpc: jest.fn(async (fn: string) => {
          dbCalls.push({ fn, args: {} });
          if (fn === 'upsert_sk_companies_batch') {
            return { data: 1, error: null };
          }
          return { data: null, error: null };
        }),
      }),
    } as unknown as SupabaseService;

    const skRpoLookup = {
      searchCompaniesByFullName: jest.fn(async () => opts.rpoResults ?? []),
    } as unknown as SkRpoLookupService;

    const typesense = opts.typesense ?? makeTypesense();
    const service = new LocationsService(supabase, skRpoLookup, typesense);
    return { service, skRpoLookup, dbCalls, typesense };
  }

  it('returns DB hits without calling RPO when limit satisfied', async () => {
    const full = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      rpo_id: i + 100,
      name: `Firma ${i} s.r.o.`,
      ico: null,
      municipality: null,
    }));
    const { service, skRpoLookup } = makeService({ dbResults: full });
    const res = await service.searchSkCompanies('Firma', 50);
    expect(res).toHaveLength(50);
    expect(skRpoLookup.searchCompaniesByFullName).not.toHaveBeenCalled();
  });

  it('calls RPO and upserts when DB returns fewer than limit', async () => {
    const { service, skRpoLookup } = makeService({
      dbResults: [],
      rpoResults: [{ id: 200, name: 'NewCo s.r.o.', ico: '12345678', municipality: 'Košice' }],
    });
    await service.searchSkCompanies('NewCo', 50);
    expect(skRpoLookup.searchCompaniesByFullName).toHaveBeenCalledWith('NewCo', 50);
  });

  it('searchSkSchools returns Typesense hits without calling RPC', async () => {
    const tsHits: SkSchoolResponseDto[] = [
      {
        id: 1,
        name: 'Gymnázium Jura Hronca',
        level: 'secondary',
        country: 'SK',
        municipality: 'Bratislava',
      },
    ];
    const dbCalls: { fn: string; args: Record<string, unknown> }[] = [];
    const supabase = {
      getReadClient: () => ({
        rpc: jest.fn(async (fn: string, args: Record<string, unknown>) => {
          dbCalls.push({ fn, args });
          return { data: null, error: null };
        }),
      }),
      getClient: () => ({ rpc: jest.fn() }),
    } as unknown as SupabaseService;
    const skRpoLookup = {
      searchCompaniesByFullName: jest.fn(),
    } as unknown as SkRpoLookupService;
    const typesense = makeTypesense(tsHits);
    const service = new LocationsService(supabase, skRpoLookup, typesense);
    const res = await service.searchSkSchools('Gymn', 'secondary', 50);
    expect(res).toEqual(tsHits);
    expect(typesense.searchSkSchools).toHaveBeenCalledWith('Gymn', 'secondary', 50);
    expect(dbCalls.some((c) => c.fn === 'search_sk_education_institutions')).toBe(false);
  });

  it('searchSkSchools falls back to RPC when Typesense returns null', async () => {
    const schoolRows = [
      {
        id: 1,
        name: 'Gymnázium Jura Hronca',
        level: 'secondary',
        country: 'SK',
        municipality: 'Bratislava',
      },
    ];
    const dbCalls: { fn: string; args: Record<string, unknown> }[] = [];
    const supabase = {
      getReadClient: () => ({
        rpc: jest.fn(async (fn: string, args: Record<string, unknown>) => {
          dbCalls.push({ fn, args });
          if (fn === 'search_sk_education_institutions') {
            return { data: schoolRows, error: null };
          }
          return { data: null, error: null };
        }),
      }),
      getClient: () => ({ rpc: jest.fn() }),
    } as unknown as SupabaseService;
    const skRpoLookup = {
      searchCompaniesByFullName: jest.fn(),
    } as unknown as SkRpoLookupService;
    const typesense = makeTypesense(null);
    const service = new LocationsService(supabase, skRpoLookup, typesense);
    const res = await service.searchSkSchools('Gymn', 'secondary', 50);
    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe('Gymnázium Jura Hronca');
    expect(dbCalls[0]?.args).toMatchObject({ p_level: 'secondary' });
  });

  it('uses memory cache on second identical query', async () => {
    const full = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      rpo_id: i + 100,
      name: `ACME ${i} s.r.o.`,
      ico: null,
      municipality: null,
    }));
    const { service, skRpoLookup } = makeService({ dbResults: full });
    await service.searchSkCompanies('ACME', 50);
    await service.searchSkCompanies('ACME', 50);
    expect(skRpoLookup.searchCompaniesByFullName).not.toHaveBeenCalled();
  });
});
