import {
  buildTypesenseParamsFromCriteria,
  computeCreatedAfterTs,
  computeCriteriaHash,
  dateKeyEuropeBratislava,
  filterFreshJobIds,
  hasAtLeastOneSearchCriterion,
  monthKeyEuropeBratislava,
  shouldDispatchJobAlert,
  stableCriteriaPayload,
} from './job-alerts-matching.util';

describe('hasAtLeastOneSearchCriterion', () => {
  it('is false when only name-like empty fields', () => {
    expect(hasAtLeastOneSearchCriterion({})).toBe(false);
  });

  it('is true for non-empty keywords', () => {
    expect(hasAtLeastOneSearchCriterion({ keywords: '  chef  ' })).toBe(true);
  });

  it('is false for location alone when radius is whole-SK (null)', () => {
    expect(
      hasAtLeastOneSearchCriterion({ location: 'Bratislava', radius_km: null }),
    ).toBe(false);
  });

  it('is false for location alone when radius is omitted', () => {
    expect(hasAtLeastOneSearchCriterion({ location: 'Košice' })).toBe(false);
  });

  it('is true for location with a concrete radius', () => {
    expect(
      hasAtLeastOneSearchCriterion({ location: 'Bratislava', radius_km: 25 }),
    ).toBe(true);
  });

  it('is true for employment_types', () => {
    expect(
      hasAtLeastOneSearchCriterion({ employment_types: ['full_time'] }),
    ).toBe(true);
  });

  it('is true for work_modes', () => {
    expect(hasAtLeastOneSearchCriterion({ work_modes: ['remote'] })).toBe(true);
  });

  it('is true for salary_min > 0', () => {
    expect(hasAtLeastOneSearchCriterion({ salary_min: 1500 })).toBe(true);
  });
});

describe('buildTypesenseParamsFromCriteria', () => {
  it('omits location when whole Slovakia (radius null)', () => {
    const p = buildTypesenseParamsFromCriteria({
      keywords: 'java',
      location: 'Bratislava',
      radius_km: null,
      employment_types: [],
    });
    expect(p.q).toBe('java');
    expect(p.location).toBeUndefined();
  });

  it('passes multiple work_modes', () => {
    const p = buildTypesenseParamsFromCriteria({
      work_modes: ['remote', 'hybrid'],
      employment_types: [],
    });
    expect(p.workModes).toEqual(['hybrid', 'remote']);
  });

  it('maps multiple categories to comma filter', () => {
    const p = buildTypesenseParamsFromCriteria({
      categories: ['gastro', 'auto'],
      employment_types: [],
    });
    expect(p.category).toBe('auto,gastro');
  });
});

describe('stableCriteriaPayload + hash', () => {
  it('is stable for equivalent criteria', () => {
    const a = stableCriteriaPayload({
      keywords: 'Foo',
      location: 'Bar',
      radius_km: 10,
      category: null,
      categories: ['gastro', 'auto'],
      employment_types: ['part_time', 'full_time'],
      salary_type: 'monthly',
      salary_min: 100,
      salary_max: null,
      work_mode: null,
      work_modes: ['remote', 'on_site'],
      work_from_home: false,
      education_levels: [],
      benefits: [],
      suitable_for: [],
      driver_licenses: [],
      work_shift_modes: [],
      language_filters: [],
      pc_skill_filters: [],
      start_types: [],
      start_date_from: null,
      frequency: 'daily',
    });
    const b = stableCriteriaPayload({
      keywords: 'FOO',
      location: 'bar',
      radius_km: 10,
      category: null,
      categories: ['auto', 'gastro'],
      employment_types: ['full_time', 'part_time'],
      salary_type: 'monthly',
      salary_min: 100,
      salary_max: null,
      work_mode: null,
      work_modes: ['on_site', 'remote'],
      work_from_home: false,
      education_levels: [],
      benefits: [],
      suitable_for: [],
      driver_licenses: [],
      work_shift_modes: [],
      language_filters: [],
      pc_skill_filters: [],
      start_types: [],
      start_date_from: null,
      frequency: 'daily',
    });
    expect(a).toBe(b);
    expect(computeCriteriaHash(a)).toBe(computeCriteriaHash(b));
  });
});

describe('computeCreatedAfterTs', () => {
  it('uses last_dispatch_at minus overlap when set', () => {
    const last = '2026-06-01T12:00:00.000Z';
    const created = '2026-05-01T12:00:00.000Z';
    const ts = computeCreatedAfterTs(last, created);
    expect(ts).toBe(
      Math.floor(new Date(last).getTime() / 1000) - 120,
    );
  });

  it('falls back to alert created_at when never dispatched', () => {
    const created = '2026-06-01T12:00:00.000Z';
    const ts = computeCreatedAfterTs(null, created);
    expect(ts).toBe(
      Math.floor(new Date(created).getTime() / 1000) - 120,
    );
  });
});

describe('filterFreshJobIds', () => {
  it('removes already-sent and duplicate ids', () => {
    const sent = new Set(['b']);
    expect(filterFreshJobIds(['a', 'b', 'a', 'c'], sent)).toEqual(['a', 'c']);
  });
});

describe('shouldDispatchJobAlert', () => {
  it('daily: dispatches on a new calendar day in Europe/Bratislava', () => {
    const last = `${dateKeyEuropeBratislava(Date.now())}T10:00:00.000Z`;
    const dayAfter = new Date(
      new Date(last).getTime() + 36 * 60 * 60 * 1000,
    ).getTime();
    expect(shouldDispatchJobAlert('daily', last, dayAfter)).toBe(true);
  });

  it('daily: does not dispatch twice same calendar day', () => {
    const now = Date.now();
    const last = new Date(now - 60 * 60 * 1000).toISOString();
    expect(shouldDispatchJobAlert('daily', last, now)).toBe(false);
  });

  it('weekly: dispatches after 7 days', () => {
    const last = new Date('2026-06-01T12:00:00.000Z').toISOString();
    const now = new Date('2026-06-09T12:00:00.000Z').getTime();
    expect(shouldDispatchJobAlert('weekly', last, now)).toBe(true);
  });

  it('weekly: does not dispatch within 7 days', () => {
    const last = new Date('2026-06-01T12:00:00.000Z').toISOString();
    const now = new Date('2026-06-05T12:00:00.000Z').getTime();
    expect(shouldDispatchJobAlert('weekly', last, now)).toBe(false);
  });

  it('monthly: dispatches on a new calendar month in Europe/Bratislava', () => {
    const lastMs = new Date('2026-05-15T12:00:00.000Z').getTime();
    const nowMs = new Date('2026-06-02T12:00:00.000Z').getTime();
    expect(monthKeyEuropeBratislava(lastMs)).not.toBe(monthKeyEuropeBratislava(nowMs));
    expect(
      shouldDispatchJobAlert(
        'monthly',
        new Date(lastMs).toISOString(),
        nowMs,
      ),
    ).toBe(true);
  });

  it('monthly: does not dispatch twice same calendar month', () => {
    const last = '2026-06-05T12:00:00.000Z';
    const now = new Date('2026-06-20T12:00:00.000Z').getTime();
    expect(shouldDispatchJobAlert('monthly', last, now)).toBe(false);
  });
});
