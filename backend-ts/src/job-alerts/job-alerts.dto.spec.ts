import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateJobEmailAlertDto } from './job-alerts.dto';

async function validateCreate(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateJobEmailAlertDto, input);
  return validate(dto);
}

describe('CreateJobEmailAlertDto', () => {
  it('rejects create with no search criteria', async () => {
    const errs = await validateCreate({
      name: 'Test',
      frequency: 'daily',
    });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('accepts keyword-only criteria', async () => {
    const errs = await validateCreate({
      name: 'Moje',
      frequency: 'daily',
      keywords: 'kuchár',
    });
    expect(errs).toHaveLength(0);
  });

  it('rejects invalid radius', async () => {
    const errs = await validateCreate({
      name: 'Moje',
      frequency: 'daily',
      keywords: 'x',
      radius_km: 99,
    });
    expect(errs.some((e) => e.property === 'radius_km')).toBe(true);
  });

  it('rejects negative salary_min', async () => {
    const errs = await validateCreate({
      name: 'Moje',
      frequency: 'weekly',
      salary_min: -1,
    });
    expect(errs.some((e) => e.property === 'salary_min')).toBe(true);
  });
});
