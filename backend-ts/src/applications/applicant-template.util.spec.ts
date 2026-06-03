import { renderApplicantMessageTemplate, escapeTemplateValue } from './applicant-template.util';

describe('applicant-template.util', () => {
  it('escapes HTML in placeholder values', () => {
    expect(escapeTemplateValue('<script>')).toBe('&lt;script&gt;');
  });

  it('replaces known template variables', () => {
    const out = renderApplicantMessageTemplate(
      'Ahoj {{candidateName}}, ponuka {{jobTitle}}, {{companyName}}, {{contactEmail}}',
      {
        candidateName: 'Jan',
        jobTitle: 'Dev',
        companyName: 'ACME',
        contactEmail: 'hr@acme.sk',
        contactPhone: '+421900',
      },
    );
    expect(out).toContain('Jan');
    expect(out).toContain('Dev');
    expect(out).toContain('ACME');
    expect(out).toContain('hr@acme.sk');
  });
});
