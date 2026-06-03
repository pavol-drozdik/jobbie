import { normalizeSearchText } from './text-normalize.util';

describe('normalizeSearchText', () => {
  it('strips Slovak diacritics and lowercases', () => {
    expect(normalizeSearchText('Gymnázium Jura Hronca')).toBe(
      'gymnazium jura hronca',
    );
  });

  it('trims whitespace', () => {
    expect(normalizeSearchText('  Bratislava  ')).toBe('bratislava');
  });
});
