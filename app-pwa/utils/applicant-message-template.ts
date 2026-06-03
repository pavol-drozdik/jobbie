/** Must match `renderApplicantMessageTemplate` in backend-ts. */
export const APPLICANT_MESSAGE_TEMPLATE_VAR_KEYS = [
  'candidateName',
  'jobTitle',
  'companyName',
  'contactEmail',
  'contactPhone',
] as const

export type ApplicantMessageTemplateVarKey =
  (typeof APPLICANT_MESSAGE_TEMPLATE_VAR_KEYS)[number]

export function applicantTemplateSnippet(
  key: ApplicantMessageTemplateVarKey,
): string {
  return `{{${key}}}`
}

/** Insert `snippet` at the textarea caret, or append when no element. */
export function insertApplicantTemplateToken(
  el: HTMLTextAreaElement | null,
  current: string,
  snippet: string,
): { next: string; insertAt: number } {
  const start = el?.selectionStart ?? current.length
  const end = el?.selectionEnd ?? current.length
  return {
    next: current.slice(0, start) + snippet + current.slice(end),
    insertAt: start,
  }
}

export function focusTextareaCaret(
  el: HTMLTextAreaElement,
  insertAt: number,
  snippetLength: number,
): void {
  const pos = insertAt + snippetLength
  el.setSelectionRange(pos, pos)
  el.focus()
}
