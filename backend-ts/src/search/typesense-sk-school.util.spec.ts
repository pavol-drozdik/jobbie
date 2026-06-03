import {
  buildSkSchoolsFilterBy,
  mapTypesenseDocToSkSchoolResponse,
  toSkSchoolTypesenseDoc,
} from './typesense-sk-school.util';

describe('typesense-sk-school.util', () => {
  it('buildSkSchoolsFilterBy secondary restricts to SK', () => {
    expect(buildSkSchoolsFilterBy('secondary')).toBe(
      'level:=secondary && country:=SK',
    );
  });

  it('buildSkSchoolsFilterBy university allows SK and CZ', () => {
    expect(buildSkSchoolsFilterBy('university')).toBe(
      'level:=university && country:[SK,CZ]',
    );
  });

  it('toSkSchoolTypesenseDoc normalizes name', () => {
    const doc = toSkSchoolTypesenseDoc({
      id: 42,
      name: 'Gymnázium',
      level: 'secondary',
      country: 'SK',
      municipality: 'Bratislava',
    });
    expect(doc.name_normalized).toBe('gymnazium');
    expect(doc.sort_id).toBe(42);
  });

  it('mapTypesenseDocToSkSchoolResponse maps valid doc', () => {
    const row = mapTypesenseDocToSkSchoolResponse({
      id: '1',
      name: 'Test škola',
      level: 'university',
      country: 'CZ',
      municipality: 'Praha',
    });
    expect(row).toEqual({
      id: 1,
      name: 'Test škola',
      level: 'university',
      country: 'CZ',
      municipality: 'Praha',
    });
  });
});
