import { parseCspReportBody } from './csp-report.util';

describe('parseCspReportBody', () => {
  it('parses legacy csp-report wrapper', () => {
    const actual = parseCspReportBody({
      'csp-report': {
        'document-uri': 'http://localhost:3001/',
        'violated-directive': 'script-src',
        'blocked-uri': 'inline',
      },
    });
    expect(actual).toEqual({
      directive: 'script-src',
      doc: 'http://localhost:3001/',
      blocked: 'inline',
    });
  });

  it('returns null for empty csp-report object', () => {
    expect(parseCspReportBody({ 'csp-report': {} })).toBeNull();
  });
});
