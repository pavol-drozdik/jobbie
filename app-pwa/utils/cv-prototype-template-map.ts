import type { CvDocumentUiTemplate } from '#cv-document/cv-document.types'
import { apiTemplateKeyToUi, uiTemplateToApiKey } from '#cv-document/cv-template-map'
import type { CvTemplateKey } from '~/types/cv'

/** Visual templates from jobbiecvdesign (Atlas, Editorial, Minimalist, Monochrome). */
export type CvPrototypeUiTemplate = CvDocumentUiTemplate

export function uiTemplateFromApiKey(key: string | null | undefined): CvPrototypeUiTemplate {
  return apiTemplateKeyToUi(key)
}

export function apiTemplateKeyFromUi(ui: CvPrototypeUiTemplate): CvTemplateKey {
  return uiTemplateToApiKey(ui) as CvTemplateKey
}
