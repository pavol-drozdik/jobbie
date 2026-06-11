import { NotFoundException } from '@nestjs/common';
import { EmployerCvDatabaseService } from './employer-cv-database.service';
import type { EmployerCvDatabaseQueryDto } from './employer-cv-database.dto';
import type { CvAggregateResponseDto } from '../cv/cv.dto';

/**
 * Minimal in-memory stand-in for the chained Supabase query builder.
 * Each table returns a static row list; chained filter methods record
 * the filter to apply server-side before yielding data.
 */
type Row = Record<string, unknown>;

class FakeQuery {
  private orderField: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private countOnly = false;

  constructor(private rows: Row[]) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }): FakeQuery {
    if (opts?.count === 'exact' && opts?.head) {
      this.countOnly = true;
    }
    return this;
  }

  eq(field: string, value: unknown): FakeQuery {
    this.rows = this.rows.filter((r) => r[field] === value);
    return this;
  }

  in(field: string, values: unknown[]): FakeQuery {
    const set = new Set(values);
    this.rows = this.rows.filter((r) => set.has(r[field]));
    return this;
  }

  gte(field: string, value: unknown): FakeQuery {
    this.rows = this.rows.filter((r) => {
      const v = r[field];
      if (v == null) return false;
      return String(v) >= String(value);
    });
    return this;
  }

  lte(field: string, value: unknown): FakeQuery {
    this.rows = this.rows.filter((r) => {
      const v = r[field];
      if (v == null) return false;
      return String(v) <= String(value);
    });
    return this;
  }

  not(field: string, operator: string, value: unknown): FakeQuery {
    if (operator === 'is' && value === null) {
      this.rows = this.rows.filter((r) => r[field] != null);
    }
    return this;
  }

  order(field: string, opts: { ascending: boolean }): FakeQuery {
    this.orderField = field;
    this.orderAsc = opts.ascending;
    return this;
  }

  range(from: number, to: number): FakeQuery {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }

  limit(n: number): FakeQuery {
    this.limitN = n;
    return this;
  }

  private materialize(): Row[] {
    let result = [...this.rows];
    if (this.orderField) {
      const f = this.orderField;
      const asc = this.orderAsc;
      result.sort((a, b) => {
        const av = a[f];
        const bv = b[f];
        if (typeof av === 'number' && typeof bv === 'number') {
          return asc ? av - bv : bv - av;
        }
        const as = String(av ?? '');
        const bs = String(bv ?? '');
        return asc ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }
    if (this.rangeStart != null && this.rangeEnd != null) {
      return result.slice(this.rangeStart, this.rangeEnd + 1);
    }
    if (this.limitN != null) {
      return result.slice(0, this.limitN);
    }
    return result;
  }

  maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const rows = this.materialize();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  then(
    resolve: (v: {
      data: Row[] | null;
      count?: number;
      error: null;
    }) => unknown,
  ) {
    const rows = this.materialize();
    if (this.countOnly) {
      return Promise.resolve({ count: rows.length, error: null, data: null }).then(
        resolve,
      );
    }
    return Promise.resolve({ data: rows, error: null }).then(resolve);
  }
}

function buildFakeClient(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const data = tables[table] ?? [];
      return new FakeQuery([...data]);
    },
  };
}

function makeService(
  tables: Record<string, Row[]>,
  cvService: {
    getEmployerAggregateByCvId?: (
      employerUserId: string,
      cvId: string,
    ) => Promise<CvAggregateResponseDto | null>;
  } = {},
): EmployerCvDatabaseService {
  const supabase = { getClient: () => buildFakeClient(tables) } as never;
  const cv = {
    getEmployerAggregateByCvId: jest
      .fn()
      .mockResolvedValue(null),
    ...cvService,
  } as never;
  const chatRooms = {} as never;
  return new EmployerCvDatabaseService(supabase, cv, chatRooms);
}

const today = new Date().toISOString();

const baseTables = (): Record<string, Row[]> => ({
  cvs: [
    {
      id: 'cv-anna',
      user_id: 'u-anna',
      updated_at: today,
      photo_url: 'https://example.com/anna.png',
      photo_storage_path: null,
      visible_to_employers: true,
    },
    {
      id: 'cv-bob',
      user_id: 'u-bob',
      updated_at: today,
      photo_url: null,
      photo_storage_path: null,
      visible_to_employers: true,
    },
    {
      id: 'cv-hidden',
      user_id: 'u-hidden',
      updated_at: today,
      photo_url: null,
      photo_storage_path: null,
      visible_to_employers: false,
    },
    {
      id: 'cv-company',
      user_id: 'u-company',
      updated_at: today,
      photo_url: null,
      photo_storage_path: null,
      visible_to_employers: true,
    },
  ],
  profiles: [
    {
      id: 'u-anna',
      display_name: 'Anna Nováková',
      first_name: 'Anna',
      last_name: 'Nováková',
      role: 'individual',
      is_deleted: false,
      logo_url: null,
      avatar_url: null,
      location: 'Bratislava',
    },
    {
      id: 'u-bob',
      display_name: 'Bob Mladý',
      first_name: 'Bob',
      last_name: 'Mladý',
      role: 'individual',
      is_deleted: false,
      logo_url: null,
      avatar_url: null,
      location: 'Košice',
    },
    {
      id: 'u-hidden',
      display_name: 'Skrytý',
      first_name: 'Skrytý',
      last_name: 'Profil',
      role: 'individual',
      is_deleted: false,
      logo_url: null,
      avatar_url: null,
      location: 'Žilina',
    },
    {
      // Company-role profile should be excluded.
      id: 'u-company',
      display_name: 'Firma s.r.o.',
      first_name: null,
      last_name: null,
      role: 'company',
      is_deleted: false,
      logo_url: null,
      avatar_url: null,
      location: null,
    },
  ],
  cv_personal_info: [
    {
      cv_id: 'cv-anna',
      first_name: 'Anna',
      last_name: 'Nováková',
      title_before_name: null,
      title_after_name: null,
      academic_title: null,
      show_academic_title: false,
      address_city: 'Bratislava',
      address_district: null,
      address_country: 'SK',
      driving_license_categories: ['B'],
      highest_education_level: 'VŠ II. stupeň',
      birth_date: '1992-04-15',
      gender: 'female',
      phone: '+421900000000',
      email: 'anna@example.com',
      about_me: 'Senior developer with experience',
      show_contact_details: true,
    },
    {
      cv_id: 'cv-bob',
      first_name: 'Bob',
      last_name: 'Mladý',
      title_before_name: null,
      title_after_name: null,
      academic_title: null,
      show_academic_title: false,
      address_city: 'Košice',
      address_district: null,
      address_country: 'SK',
      driving_license_categories: [],
      highest_education_level: 'Stredná škola',
      birth_date: '2003-01-01',
      gender: 'male',
      phone: null,
      email: null,
      about_me: null,
      show_contact_details: true,
    },
  ],
  cv_job_preferences: [
    {
      cv_id: 'cv-anna',
      desired_positions: ['Frontend developer'],
      desired_locations: ['Bratislava'],
      employment_types: ['full_time'],
      start_availability: 'Ihneď',
      salary_min: 2000,
      salary_currency: 'EUR',
      salary_period: 'monthly',
      weekend_work: false,
      night_work: false,
      email_job_alerts: true,
      additional_skills_info: null,
    },
    {
      cv_id: 'cv-bob',
      desired_positions: ['Junior tester'],
      desired_locations: ['Košice'],
      employment_types: ['part_time', 'agreement'],
      start_availability: 'Do 1 mesiaca',
      salary_min: 1000,
      salary_currency: 'EUR',
      salary_period: 'monthly',
      weekend_work: true,
      night_work: false,
      email_job_alerts: false,
      additional_skills_info: null,
    },
  ],
  cv_skills: [
    { cv_id: 'cv-anna', skill_name: 'JavaScript', sort_order: 0 },
    { cv_id: 'cv-anna', skill_name: 'Vue', sort_order: 1 },
    { cv_id: 'cv-bob', skill_name: 'Manual testing', sort_order: 0 },
  ],
  cv_languages: [
    { cv_id: 'cv-anna', language: 'English', level: 'C1', sort_order: 0 },
    { cv_id: 'cv-anna', language: 'Slovak', level: 'C2', sort_order: 1 },
    { cv_id: 'cv-bob', language: 'English', level: 'A2', sort_order: 0 },
  ],
  cv_experience: [
    {
      cv_id: 'cv-anna',
      company: 'Acme',
      position: 'Senior frontend',
      current: true,
      start_date: '2018-01-01',
      end_date: null,
      sort_order: 0,
      description: null,
      entry_type: 'employment',
    },
    {
      cv_id: 'cv-bob',
      company: 'Startup',
      position: 'Tester',
      current: false,
      start_date: '2023-09-01',
      end_date: '2024-06-01',
      sort_order: 0,
      description: null,
      entry_type: 'employment',
    },
  ],
  cv_soft_skills: [],
  cv_education: [
    {
      cv_id: 'cv-anna',
      school: 'STU Bratislava',
      degree: 'Ing.',
      field: 'Informatika',
      institution: null,
      education_kind: 'university',
      has_graduation: true,
      study_level: 'university_mgr',
      start_date: '2014-09-01',
      end_date: '2019-06-30',
      sort_order: 0,
    },
    {
      cv_id: 'cv-bob',
      school: 'Gymnázium',
      degree: null,
      field: null,
      institution: null,
      education_kind: 'secondary',
      has_graduation: false,
      study_level: 'secondary',
      start_date: '2018-09-01',
      end_date: '2023-06-30',
      sort_order: 0,
    },
  ],
  cv_certifications: [
    { cv_id: 'cv-anna', name: 'AWS Certified', description: null },
  ],
});

function q(extra: Partial<EmployerCvDatabaseQueryDto> = {}): EmployerCvDatabaseQueryDto {
  return { ...extra };
}

describe('EmployerCvDatabaseService.list', () => {
  it('returns only visible_to_employers individual-role candidates', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q());
    const ids = res.items.map((i) => i.cv_id).sort();
    expect(ids).toEqual(['cv-anna', 'cv-bob']);
    const anna = res.items.find((i) => i.cv_id === 'cv-anna');
    expect(anna?.candidate_display_name).toBe('Anna N.');
    expect(anna?.location).toBe('Bratislava');
    expect(anna?.education_summary).toBe('STU Bratislava · Informatika, Ing.');
    const bob = res.items.find((i) => i.cv_id === 'cv-bob');
    expect(bob?.candidate_display_name).toBe('Bob M.');
    expect(bob?.location).toBe('Košice');
    expect(bob?.education_summary).toBe('Gymnázium');
  });

  it('filters by jobTypes (ANY match)', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ jobTypes: ['part_time'] }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-bob']);
  });

  it('filters by skills (ALL match, case-insensitive)', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ skills: ['vue', 'javascript'] }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('orders top_skills with active filter skills first', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ skills: ['vue', 'javascript'] }));
    const anna = res.items.find((i) => i.cv_id === 'cv-anna');
    expect(anna?.top_skills.slice(0, 2)).toEqual(['Vue', 'JavaScript']);
  });

  it('filters by languages with min level (B2)', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list(
      'employer-1',
      q({ languages: ['English'], languageLevels: 'english:B2' }),
    );
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('filters by salaryMax (recruiter Plat do)', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ salaryMax: 1500 }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-bob']);
  });

  it('filters by hasPhoto', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ hasPhoto: '1' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('filters by hasPhone / hasEmail', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ hasPhone: '1', hasEmail: '1' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('filters by canReceiveOffers', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ canReceiveOffers: '1' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('filters by hasCertificate', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ hasCertificate: '1' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('filters by experience bucket 6_10', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ experience: '6_10' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('filters by educationLevel (university_mgr)', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ educationLevel: 'university_mgr' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('sorts by salary_asc (nulls last)', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ sort: 'salary_asc' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-bob', 'cv-anna']);
  });

  it('sorts by experience_desc', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ sort: 'experience_desc' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna', 'cv-bob']);
  });

  it('search q matches across about_me', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q({ q: 'senior developer' }));
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-anna']);
  });

  it('excludes CVs where visible_to_employers is false', async () => {
    const t = baseTables();
    t.cvs = t.cvs.map((c) =>
      c.id === 'cv-anna' ? { ...c, visible_to_employers: false } : c,
    );
    const svc = makeService(t);
    const res = await svc.list('employer-1', q());
    expect(res.items.map((i) => i.cv_id)).toEqual(['cv-bob']);
  });

  it('flags has_contact_to_unlock until employer unlocks stored contact', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q());
    const anna = res.items.find((i) => i.cv_id === 'cv-anna');
    expect(anna?.has_contact_to_unlock).toBe(true);
    expect(anna?.contacts_visible).toBe(false);
    expect(anna?.contact_email).toBeNull();
  });

  it('exposes contact email on list after employer unlock', async () => {
    const t = baseTables();
    t.cv_contact_unlocks = [
      { company_id: 'employer-1', cv_id: 'cv-anna' },
    ];
    const svc = makeService(t);
    const res = await svc.list('employer-1', q());
    const anna = res.items.find((i) => i.cv_id === 'cv-anna');
    expect(anna?.contacts_visible).toBe(true);
    expect(anna?.contact_email).toBe('anna@example.com');
    expect(anna?.has_contact_to_unlock).toBe(false);
  });

  it('does not offer unlock when candidate has no contact on file', async () => {
    const svc = makeService(baseTables());
    const res = await svc.list('employer-1', q());
    const bob = res.items.find((i) => i.cv_id === 'cv-bob');
    expect(bob?.has_contact_to_unlock).toBe(false);
    expect(bob?.contacts_visible).toBe(false);
  });

  it('includes sparse opted-in CV without positions, skills, or experience', async () => {
    const t = baseTables();
    t.cvs.push({
      id: 'cv-sparse',
      user_id: 'u-sparse',
      updated_at: today,
      photo_url: null,
      photo_storage_path: null,
      visible_to_employers: true,
    });
    t.profiles.push({
      id: 'u-sparse',
      display_name: 'Sparse User',
      first_name: 'Sparse',
      last_name: 'User',
      role: 'individual',
      is_deleted: false,
      logo_url: null,
      avatar_url: null,
      location: 'Trnava',
      public_show_in_company_search: true,
    });
    t.cv_personal_info.push({
      cv_id: 'cv-sparse',
      first_name: 'Sparse',
      last_name: 'User',
      title_before_name: null,
      title_after_name: null,
      academic_title: null,
      show_academic_title: false,
      address_city: 'Trnava',
      address_district: null,
      address_country: 'SK',
      driving_license_categories: [],
      highest_education_level: null,
      about_me: null,
    });
    const svc = makeService(t);
    const res = await svc.list('employer-1', q());
    expect(res.items.map((i) => i.cv_id)).toContain('cv-sparse');
  });
});

describe('EmployerCvDatabaseService.getDetail', () => {
  it('returns aggregate when CvService provides employer view', async () => {
    const agg = {
      cv: { user_id: 'u-anna', display_title: 'Dev' },
      experience: [],
      education: [],
      skills: [],
      soft_skills: [],
      languages: [],
      certifications: [],
      links: [],
      volunteering: [],
      portfolio_links: [],
      awards: [],
      references: [],
    } as unknown as CvAggregateResponseDto;
    const svc = makeService(baseTables(), {
      getEmployerAggregateByCvId: async () => agg,
    });
    await expect(svc.getDetail('employer-1', 'cv-anna')).resolves.toMatchObject({
      cv: {
        user_id: 'u-anna',
        display_title: 'Dev',
        contacts_visible: false,
        has_contact_to_unlock: true,
        contact_unlocked: false,
        email: null,
      },
    });
  });

  it('throws NotFound when CvService returns null', async () => {
    const svc = makeService(baseTables(), {
      getEmployerAggregateByCvId: async () => null,
    });
    await expect(svc.getDetail('employer-1', 'cv-anna')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('redacts discrimination-sensitive fields from employer detail cv', async () => {
    const agg = {
      cv: {
        user_id: 'u-anna',
        display_title: 'Dev',
        has_disability: false,
        gender: 'female',
        birth_date: '1990-01-15',
      },
      experience: [],
      education: [],
      skills: [],
      soft_skills: [],
      languages: [],
      certifications: [],
      links: [],
      volunteering: [],
      portfolio_links: [],
      awards: [],
      references: [],
    } as unknown as CvAggregateResponseDto;
    const svc = makeService(baseTables(), {
      getEmployerAggregateByCvId: async () => agg,
    });
    const detail = await svc.getDetail('employer-1', 'cv-anna');
    expect(detail.cv).not.toHaveProperty('has_disability');
    expect(detail.cv).not.toHaveProperty('gender');
    expect(detail.cv).not.toHaveProperty('birth_date');
  });
});
