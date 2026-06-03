/** Escape template placeholder values (no HTML execution). */
export function escapeTemplateValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type ApplicantTemplateVars = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
};

export function renderApplicantMessageTemplate(
  template: string,
  vars: ApplicantTemplateVars,
): string {
  const safe = {
    candidateName: escapeTemplateValue(vars.candidateName),
    jobTitle: escapeTemplateValue(vars.jobTitle),
    companyName: escapeTemplateValue(vars.companyName),
    contactEmail: escapeTemplateValue(vars.contactEmail),
    contactPhone: escapeTemplateValue(vars.contactPhone),
  };
  return template
    .replace(/\{\{\s*candidateName\s*\}\}/g, safe.candidateName)
    .replace(/\{\{\s*jobTitle\s*\}\}/g, safe.jobTitle)
    .replace(/\{\{\s*companyName\s*\}\}/g, safe.companyName)
    .replace(/\{\{\s*contactEmail\s*\}\}/g, safe.contactEmail)
    .replace(/\{\{\s*contactPhone\s*\}\}/g, safe.contactPhone)
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
