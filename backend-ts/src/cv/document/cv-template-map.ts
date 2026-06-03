import type { CvDocumentUiTemplate } from './cv-document.types'

/** Stored `template_key` values on user_cvs. */
export type CvStoredTemplateKey =
  | 'modern'
  | 'minimal'
  | 'professional'
  | 'creative'
  | 'elegant'
  | 'classic'

const API_TO_UI: Record<string, CvDocumentUiTemplate> = {
  modern: 'atlas',
  elegant: 'editorial',
  minimal: 'minimalist',
  professional: 'monochrome',
  creative: 'atlas',
  classic: 'monochrome',
}

const UI_TO_API: Record<CvDocumentUiTemplate, CvStoredTemplateKey> = {
  atlas: 'modern',
  editorial: 'elegant',
  minimalist: 'minimal',
  monochrome: 'professional',
}

export function apiTemplateKeyToUi(key: string | null | undefined): CvDocumentUiTemplate {
  const k = String(key || 'modern')
  return API_TO_UI[k] ?? 'atlas'
}

export function uiTemplateToApiKey(ui: CvDocumentUiTemplate): CvStoredTemplateKey {
  return UI_TO_API[ui] ?? 'modern'
}
