import { ValidationPipe } from '@nestjs/common';
import { CvHeaderPatchDto, CvProgressPatchDto, ExperienceUpsertDto } from './cv.dto';

describe('CvHeaderPatchDto (ValidationPipe whitelist)', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it('keeps first_name and last_name from PATCH body', async () => {
    const out = await pipe.transform(
      { first_name: 'Ján', last_name: 'Novák', email: 'jan@example.com' },
      { type: 'body', metatype: CvHeaderPatchDto },
    );
    expect(out).toEqual({
      first_name: 'Ján',
      last_name: 'Novák',
      email: 'jan@example.com',
    });
  });

  it('strips unknown properties', async () => {
    const out = await pipe.transform(
      { first_name: 'A', hacker_field: 'x' },
      { type: 'body', metatype: CvHeaderPatchDto },
    );
    expect(out).toEqual({ first_name: 'A' });
    expect((out as Record<string, unknown>).hacker_field).toBeUndefined();
  });
});

describe('CvProgressPatchDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it('keeps wizard_step', async () => {
    const out = await pipe.transform(
      { wizard_step: 'final', wizard_section: null },
      { type: 'body', metatype: CvProgressPatchDto },
    );
    expect(out).toEqual({ wizard_step: 'final', wizard_section: null });
  });
});

describe('ExperienceUpsertDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it('keeps position and company', async () => {
    const out = await pipe.transform(
      { position: 'Predavač', company: 'Obchod s.r.o.' },
      { type: 'body', metatype: ExperienceUpsertDto },
    );
    expect(out).toEqual({ position: 'Predavač', company: 'Obchod s.r.o.' });
  });
});
