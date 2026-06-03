import {
  normalizeSkIco,
  isRpoSearchResultActive,
  parseRpoSearchResponseIndicatesActiveSubject,
} from './sk-rpo-ico.util';

describe('normalizeSkIco', () => {
  it('strips spaces and non-digits', () => {
    expect(normalizeSkIco('50 88 1337')).toBe('50881337');
  });
  it('returns empty for null', () => {
    expect(normalizeSkIco(null)).toBe('');
  });
  it('returns empty when no digits', () => {
    expect(normalizeSkIco('abc')).toBe('');
  });
});

describe('isRpoSearchResultActive', () => {
  it('treats missing termination as active', () => {
    expect(isRpoSearchResultActive({ id: 1 })).toBe(true);
  });
  it('treats future termination as active', () => {
    const future = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
    expect(isRpoSearchResultActive({ termination: future })).toBe(true);
  });
  it('treats past termination as inactive', () => {
    expect(isRpoSearchResultActive({ termination: '2000-01-01' })).toBe(false);
  });
});

describe('parseRpoSearchResponseIndicatesActiveSubject', () => {
  it('returns false for empty results', () => {
    expect(parseRpoSearchResponseIndicatesActiveSubject({ results: [] })).toBe(false);
  });
  it('returns true when one active result', () => {
    expect(
      parseRpoSearchResponseIndicatesActiveSubject({
        results: [{ id: 1, termination: null }],
      }),
    ).toBe(true);
  });
  it('returns false when all terminated', () => {
    expect(
      parseRpoSearchResponseIndicatesActiveSubject({
        results: [{ termination: '2000-01-01' }],
      }),
    ).toBe(false);
  });
});
