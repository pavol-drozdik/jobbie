/** Default applicant auto-reply bodies (mirror backend-ts employer-applicants.service). */
export const DEFAULT_REJECTION_TEMPLATE = `Dobrý deň {{candidateName}},


ďakujeme za Váš záujem o pracovnú ponuku {{jobTitle}}.


Po posúdení uchádzačov sme sa rozhodli pokračovať s iným kandidátom. Prajeme Vám veľa úspechov pri hľadaní práce.


S pozdravom,
{{companyName}}`

export const DEFAULT_INTERVIEW_TEMPLATE = `Dobrý deň {{candidateName}},


ďakujeme za Váš záujem o pracovnú ponuku {{jobTitle}}.


Po posúdení Vašej prihlášky by sme Vás radi pozvali na pohovor. Prosíme, kontaktujte nás, aby sme si dohodli vhodný dátum a čas.


S pozdravom,
{{companyName}}`

export type ApplicantMessageTemplateSeed = {
  id: string
  status_type: 'rejected' | 'interview_invited'
  message_text: string
  enabled: boolean
}

export function seedApplicantMessageTemplates(): ApplicantMessageTemplateSeed[] {
  return [
    {
      id: '',
      status_type: 'rejected',
      message_text: DEFAULT_REJECTION_TEMPLATE,
      enabled: false,
    },
    {
      id: '',
      status_type: 'interview_invited',
      message_text: DEFAULT_INTERVIEW_TEMPLATE,
      enabled: false,
    },
  ]
}
