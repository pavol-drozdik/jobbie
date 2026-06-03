import {
  mapRpoSearchRowToCompany,
  parseRpoCompanySearchResponse,
} from './sk-rpo-search.util';

describe('mapRpoSearchRowToCompany', () => {
  it('picks current full name and IČO', () => {
    const row = mapRpoSearchRowToCompany({
      id: 1,
      identifiers: [{ value: '50881337', validFrom: '2000-01-01' }],
      fullNames: [
        { value: 'Old s.r.o.', validFrom: '1990-01-01', validTo: '1999-12-31' },
        { value: 'ACME s.r.o.', validFrom: '2000-01-01' },
      ],
      addresses: [
        {
          validFrom: '2000-01-01',
          municipality: { value: 'Bratislava' },
        },
      ],
    });
    expect(row).toEqual({
      id: 1,
      name: 'ACME s.r.o.',
      ico: '50881337',
      municipality: 'Bratislava',
    });
  });

  it('returns null for terminated subject', () => {
    expect(
      mapRpoSearchRowToCompany({
        id: 2,
        termination: '2000-01-01',
        fullNames: [{ value: 'Dead s.r.o.', validFrom: '1990-01-01' }],
      }),
    ).toBeNull();
  });
});

describe('parseRpoCompanySearchResponse', () => {
  it('dedupes by IČO and caps limit', () => {
    const rows = parseRpoCompanySearchResponse(
      {
        results: [
          {
            id: 1,
            fullNames: [{ value: 'A s.r.o.', validFrom: '2000-01-01' }],
            identifiers: [{ value: '11111111', validFrom: '2000-01-01' }],
          },
          {
            id: 2,
            fullNames: [{ value: 'A s.r.o.', validFrom: '2001-01-01' }],
            identifiers: [{ value: '11111111', validFrom: '2001-01-01' }],
          },
          {
            id: 3,
            fullNames: [{ value: 'B s.r.o.', validFrom: '2000-01-01' }],
          },
        ],
      },
      10,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.ico).toBe('11111111');
    expect(rows[1]?.name).toBe('B s.r.o.');
  });
});
