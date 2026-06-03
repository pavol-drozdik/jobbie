import { CvService } from './cv.service';

type Row = Record<string, unknown>;

class FakeQuery {
  constructor(private rows: Row[]) {}

  select(_cols?: string, _opts?: { count?: string; head?: boolean }): FakeQuery {
    return this;
  }

  eq(field: string, value: unknown): FakeQuery {
    this.rows = this.rows.filter((r) => r[field] === value);
    return this;
  }

  maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const row = this.rows[0] ?? null;
    return Promise.resolve({ data: row, error: null });
  }
}

function buildFakeClient(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      return new FakeQuery([...(tables[table] ?? [])]);
    },
  };
}

function makeCvService(tables: Record<string, Row[]>): CvService {
  const supabase = { getClient: () => buildFakeClient(tables) } as never;
  const cvPdf = {} as never;
  return new CvService(supabase, cvPdf);
}

const sparseTables = (): Record<string, Row[]> => ({
  cvs: [
    {
      id: 'cv-sparse',
      user_id: 'u-sparse',
      visible_to_employers: true,
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cv-hidden',
      user_id: 'u-sparse',
      visible_to_employers: false,
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  profiles: [
    {
      id: 'u-sparse',
      role: 'individual',
      is_deleted: false,
      public_show_in_company_search: true,
      customer_role: false,
      provider_role: false,
    },
    {
      id: 'employer-co',
      role: 'company',
      customer_role: false,
      provider_role: false,
    },
    {
      id: 'u-opt-out',
      role: 'individual',
      is_deleted: false,
      public_show_in_company_search: false,
    },
  ],
});

describe('CvService.isCvEligibleForEmployerDatabase', () => {
  it('returns true for opted-in sparse CV without positions, skills, or experience', async () => {
    const svc = makeCvService(sparseTables());
    await expect(svc.isCvEligibleForEmployerDatabase('cv-sparse')).resolves.toBe(true);
  });

  it('returns false when visible_to_employers is false', async () => {
    const svc = makeCvService(sparseTables());
    await expect(svc.isCvEligibleForEmployerDatabase('cv-hidden')).resolves.toBe(
      false,
    );
  });

  it('returns false when public_show_in_company_search is false', async () => {
    const t = sparseTables();
    t.cvs = [
      {
        id: 'cv-opt-out',
        user_id: 'u-opt-out',
        visible_to_employers: true,
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    const svc = makeCvService(t);
    await expect(svc.isCvEligibleForEmployerDatabase('cv-opt-out')).resolves.toBe(
      false,
    );
  });
});

describe('CvService.getEmployerAggregateByCvId', () => {
  it('rejects non-employer viewers', async () => {
    const t = sparseTables();
    const svc = makeCvService(t);
    await expect(
      svc.getEmployerAggregateByCvId('u-sparse', 'cv-sparse'),
    ).resolves.toBeNull();
  });
});
