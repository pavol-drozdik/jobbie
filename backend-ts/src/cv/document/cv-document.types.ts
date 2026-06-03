/** UI template ids aligned with jobbiecvdesign. */
export type CvDocumentUiTemplate = 'atlas' | 'editorial' | 'minimalist' | 'monochrome'

export type CvDocumentMode = 'preview' | 'pdf'

export interface CvDocumentExperienceItem {
  title: string
  employer: string
  city: string
  current: boolean
  fromYear: string
  fromMonth: string
  toYear: string
  toMonth: string
  description: string
  bullets: string[]
}

export interface CvDocumentEducationItem {
  type: string
  title: string
  field: string
  institution: string
  maturita: boolean
  fromYear: string
  toYear: string
  description: string
  bullets: string[]
}

export interface CvDocumentSkillItem {
  name: string
  level: string
}

export interface CvDocumentLanguageItem {
  name: string
  level: string
}

export interface CvDocumentExtraBlock {
  title: string
  bodyHtml: string
}

export interface CvDocumentExportData {
  template: CvDocumentUiTemplate
  titlePrefix: string
  titleSuffix: string
  firstName: string
  lastName: string
  fullName: string
  gender: string
  birthDate: string
  email: string
  phone: string
  street: string
  postalCode: string
  city: string
  linkedinUrl: string
  desiredRole: string
  summary: string
  hobbies: string
  extraInfo: string
  salaryAmount: string
  salaryUnit: string
  workTypes: string[]
  startTerm: string
  drivingLicenses: string[]
  profilePhoto: string
  experiences: CvDocumentExperienceItem[]
  education: CvDocumentEducationItem[]
  skills: CvDocumentSkillItem[]
  languages: CvDocumentLanguageItem[]
  softSkills: string[]
  extraBlocks: CvDocumentExtraBlock[]
  showSummary: boolean
  showHobbies: boolean
  showDriving: boolean
  showExtraInfo: boolean
}
