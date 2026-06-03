import type { Ref } from 'vue'

import { nextTick, onMounted, onUnmounted, watch } from 'vue'

import type { CvDocumentExportData, CvDocumentMode } from '#cv-document/cv-document.types'

import { measureAppStickyHeaderOffsetPx } from '~/utils/app-sticky-header'

import { fetchApiBinary } from '~/utils/api-binary-fetch'

import { triggerBlobDownload } from '~/utils/trigger-blob-download'

export type { CvDocumentMode as CvDocumentMode }

export type CvPrototypeExportData = CvDocumentExportData

export interface CvPrototypeExperienceItem {
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

export interface CvPrototypeEducationItem {
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

export interface CvPrototypeSkillItem {
  name: string
  level: string
}

export interface CvPrototypeLanguageItem {
  name: string
  level: string
}

export type OpenCvPreviewOptions = {
  cvId?: string
  failedMessage?: string
}

async function coerceProfilePhotoForServer(photo: string): Promise<string> {
  const trimmed = (photo ?? '').trim()
  if (!trimmed || trimmed.startsWith('data:')) {
    return trimmed
  }
  if (!trimmed.startsWith('blob:')) {
    return trimmed
  }
  const res = await fetch(trimmed)
  if (!res.ok) {
    return ''
  }
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (): void => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = (): void => {
      reject(new Error('Nepodarilo sa pripraviť fotku pre export.'))
    }
    reader.readAsDataURL(blob)
  })
}

function parseApiErrorBody(text: string, fallback: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return fallback
  }
  try {
    const parsed = JSON.parse(trimmed) as { message?: string | string[] }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim()
    }
    if (Array.isArray(parsed.message)) {
      const joined = parsed.message.map(String).join(', ').trim()
      if (joined) {
        return joined
      }
    }
  } catch {
    // plain text body
  }
  if (trimmed.startsWith('{')) {
    return fallback
  }
  return trimmed.length > 280 ? fallback : trimmed
}

function parsePdfFilename(contentDisposition: string | null, fallback: string): string {
  const dispo = contentDisposition ?? ''
  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(dispo)
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1].trim()) || fallback
    } catch {
      return fallback
    }
  }
  return match?.[2]?.trim() || fallback
}

async function fetchCvPdfFromExportPayload(
  cvId: string,
  payload: CvDocumentExportData,
  failedMessage: string,
): Promise<{ blob: Blob; filename: string }> {
  const { session } = useAuth()
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/$/, '')
  const res = await fetchApiBinary(
    `${base}/api/cv/${encodeURIComponent(cvId)}/document/preview`,
    session.value,
    {
      method: 'POST',
      accept: 'application/pdf',
      apiBaseUrl: base,
      body: payload,
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseApiErrorBody(text, failedMessage))
  }
  const blob = await res.blob()
  if (!blob.size) {
    throw new Error(failedMessage)
  }
  const { getSafeCvFileName } = await import('#cv-document/cv-document-utils')
  const fallback = `${getSafeCvFileName(payload.fullName)}.pdf`
  const filename = parsePdfFilename(res.headers.get('content-disposition'), fallback)
  return { blob, filename }
}

async function buildPreviewExportPayload(
  data: CvDocumentExportData,
): Promise<CvDocumentExportData> {
  const profilePhoto = await coerceProfilePhotoForServer(data.profilePhoto)
  return { ...data, profilePhoto }
}

/** Temporary HTML preview for template/CSS tweaks (`POST …/document/preview-html`). */
export async function openCvHtmlPreviewFromData(
  data: CvDocumentExportData,
  options?: OpenCvPreviewOptions,
): Promise<boolean> {
  if (!import.meta.client) {
    return false
  }
  const cvId = options?.cvId?.trim()
  const failedMessage =
    options?.failedMessage?.trim() || 'Náhľad sa nepodarilo pripraviť.'
  if (!cvId) {
    throw new Error(failedMessage)
  }
  const payload = await buildPreviewExportPayload(data)
  const { session } = useAuth()
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/$/, '')
  const res = await fetchApiBinary(
    `${base}/api/cv/${encodeURIComponent(cvId)}/document/preview-html`,
    session.value,
    {
      method: 'POST',
      accept: 'text/html',
      apiBaseUrl: base,
      body: payload,
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseApiErrorBody(text, failedMessage))
  }
  const previewHtml = await res.text()
  if (!previewHtml.trim()) {
    throw new Error(failedMessage)
  }
  const previewWindow = window.open('', '_blank')
  if (!previewWindow) {
    return false
  }
  previewWindow.document.open()
  previewWindow.document.write(previewHtml)
  previewWindow.document.close()
  return true
}

/** Server PDF preview — same Playwright pipeline as stored CV PDF (`POST …/document/preview`). */
export async function openCvPreviewFromData(
  data: CvDocumentExportData,
  options?: OpenCvPreviewOptions,
): Promise<boolean> {
  if (!import.meta.client) {
    return false
  }
  const cvId = options?.cvId?.trim()
  const failedMessage =
    options?.failedMessage?.trim() || 'Náhľad sa nepodarilo pripraviť.'
  if (!cvId) {
    throw new Error(failedMessage)
  }
  const previewWindow = window.open('about:blank', '_blank')
  if (!previewWindow) {
    return false
  }
  try {
    const payload = await buildPreviewExportPayload(data)
    const { blob } = await fetchCvPdfFromExportPayload(cvId, payload, failedMessage)
    const url = URL.createObjectURL(blob)
    previewWindow.location.replace(url)
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
    return true
  } catch (err) {
    previewWindow.close()
    throw err
  }
}

/** Download PDF from current editor draft (`POST …/pdf/render`). */
export async function downloadCvPdfFromData(
  data: CvDocumentExportData,
  options?: { failedMessage?: string; cvId?: string },
): Promise<void> {
  const failedMessage =
    options?.failedMessage?.trim() || 'PDF sa nepodarilo vygenerovať. Uložte životopis a skúste znova.'
  const cvId = options?.cvId?.trim()
  if (!cvId) {
    throw new Error(failedMessage)
  }
  if (!import.meta.client) {
    throw new Error(failedMessage)
  }
  try {
    const payload = await buildPreviewExportPayload(data)
    const { session } = useAuth()
    const config = useRuntimeConfig()
    const base = String(config.public.apiBaseUrl || '').replace(/\/$/, '')
    const res = await fetchApiBinary(
      `${base}/api/cv/${encodeURIComponent(cvId)}/pdf/render`,
      session.value,
      {
        method: 'POST',
        accept: 'application/pdf',
        apiBaseUrl: base,
        body: payload,
      },
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(parseApiErrorBody(text, failedMessage))
    }
    const blob = await res.blob()
    if (!blob.size) {
      throw new Error(failedMessage)
    }
    const { getSafeCvFileName } = await import('#cv-document/cv-document-utils')
    const fallback = `${getSafeCvFileName(data.fullName)}.pdf`
    const filename = parsePdfFilename(res.headers.get('content-disposition'), fallback)
    triggerBlobDownload(blob, filename)
  } catch (err) {
    if (err instanceof Error && err.message.trim()) {
      throw err
    }
    throw new Error(failedMessage)
  }
}

export type StickySidebarOptions = {
  mobileBreakpoint?: number
  offset?: number
}

export function useCvPrototypeStickySidebar(
  sidebarRef: Ref<HTMLElement | null>,
  shellRef: Ref<HTMLElement | null>,
  options: StickySidebarOptions = {},
): void {
  const mobileBreakpoint = options.mobileBreakpoint ?? 820
  let rafId: number | null = null

  function resolveStickyOffset(): number {
    if (options.offset !== undefined) {
      return options.offset
    }
    return measureAppStickyHeaderOffsetPx()
  }

  function clearSidebarInlineStyles(sidebar: HTMLElement): void {
    sidebar.style.transform = ''
    sidebar.style.position = ''
    sidebar.style.top = ''
    sidebar.style.width = ''
  }

  /** translateY keeps the aside in grid flow; position:absolute broke the two-column layout. */
  function updateSidebarPosition(): void {
    const sidebar = sidebarRef.value
    const shell = shellRef.value
    if (!sidebar || !shell) {
      return
    }
    if (window.innerWidth <= mobileBreakpoint) {
      clearSidebarInlineStyles(sidebar)
      return
    }
    const shellRect = shell.getBoundingClientRect()
    const shellHeight = shell.offsetHeight
    const sidebarHeight = sidebar.offsetHeight
    const maxTranslate = Math.max(0, shellHeight - sidebarHeight)
    const stickyOffset = resolveStickyOffset()
    const translate = Math.min(Math.max(0, -shellRect.top + stickyOffset), maxTranslate)
    clearSidebarInlineStyles(sidebar)
    sidebar.style.transform = `translateY(${translate}px)`
  }

  function scheduleUpdate(): void {
    if (rafId != null) {
      return
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = null
      updateSidebarPosition()
    })
  }

  onMounted(() => {
    if (!import.meta.client) {
      return
    }
    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })
  })

  onUnmounted(() => {
    if (!import.meta.client) {
      return
    }
    if (rafId != null) {
      window.cancelAnimationFrame(rafId)
    }
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    const sidebar = sidebarRef.value
    if (sidebar) {
      clearSidebarInlineStyles(sidebar)
    }
  })

  watch([sidebarRef, shellRef], () => {
    nextTick(() => scheduleUpdate())
  })
}
