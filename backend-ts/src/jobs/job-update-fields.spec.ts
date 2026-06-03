import {
  JOB_UPDATE_ALLOWED_FIELDS,
  pickJobUpdateFields,
} from './job-update-fields';
import type { JobOfferUpdateDto } from './jobs.dto';

describe('pickJobUpdateFields', () => {
  it('keeps allowlisted fields and drops unknown / forbidden keys', () => {
    const body = {
      title: 'x',
      description: 'y',
      // forbidden — must not flow through PATCH
      company_id: 'attacker-uuid',
      id: 'other-uuid',
      created_at: '2024-01-01',
      is_deleted: true,
      // is_foreign explicitly disallowed for PATCH (controller also blocks the
      // transition, but the field should be stripped before the UPDATE runs)
      is_foreign: true,
    } as unknown as JobOfferUpdateDto;

    const out = pickJobUpdateFields(body) as Record<string, unknown>;

    expect(out.title).toBe('x');
    expect(out.description).toBe('y');
    expect(out).not.toHaveProperty('company_id');
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('created_at');
    expect(out).not.toHaveProperty('is_deleted');
    expect(out).not.toHaveProperty('is_foreign');
  });

  it('drops undefined values', () => {
    const body = {
      title: undefined,
      description: 'kept',
    } as unknown as JobOfferUpdateDto;
    const out = pickJobUpdateFields(body);
    expect(out).toEqual({ description: 'kept' });
  });

  it('exposes a non-empty allowlist', () => {
    expect(JOB_UPDATE_ALLOWED_FIELDS.length).toBeGreaterThan(20);
    expect(JOB_UPDATE_ALLOWED_FIELDS).toContain('title');
    expect(JOB_UPDATE_ALLOWED_FIELDS).not.toContain('company_id' as never);
    expect(JOB_UPDATE_ALLOWED_FIELDS).not.toContain('is_foreign' as never);
  });
});
