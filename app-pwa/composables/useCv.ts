import type { CvAggregateResponseDto, CvHeaderResponseDto, CvListItemResponseDto } from '~/types/cv'
import { fetchApiBinary } from '~/utils/api-binary-fetch'
import { parseApiErrorMessage } from '~/utils/api-errors'

export type CvSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function unwrap<T>(res: { ok: boolean; data?: T; status: number; body: string }): T {
  if (!res.ok || res.data === undefined) {
    throw new Error(parseApiErrorMessage(res, 'Operácia zlyhala.'))
  }
  return res.data
}

/** CV section CRUD via Nest BFF cookies + CSRF (useApi). */
export function useCv() {
  const config = useRuntimeConfig()
  const { api } = useApi()
  const baseUrl = computed(() => String(config.public.apiBaseUrl || '').replace(/\/$/, ''))

  async function listCvs(): Promise<CvListItemResponseDto[]> {
    return unwrap(await api<CvListItemResponseDto[]>('/api/cv'))
  }

  async function createCv(body: {
    display_title?: string
    template_key?: string
  }): Promise<CvHeaderResponseDto> {
    return unwrap(
      await api<CvHeaderResponseDto>('/api/cv', { method: 'POST', body }),
    )
  }

  async function getCvAggregate(cvId: string): Promise<CvAggregateResponseDto> {
    return unwrap(await api<CvAggregateResponseDto>(`/api/cv/${cvId}`))
  }

  async function patchCv(
    cvId: string,
    body: Record<string, unknown>,
  ): Promise<CvHeaderResponseDto> {
    return unwrap(
      await api<CvHeaderResponseDto>(`/api/cv/${cvId}`, { method: 'PATCH', body }),
    )
  }

  async function patchProgress(
    cvId: string,
    body: { wizard_step: string; wizard_section?: string | null },
  ): Promise<CvHeaderResponseDto> {
    return unwrap(
      await api<CvHeaderResponseDto>(`/api/cv/${cvId}/progress`, {
        method: 'PATCH',
        body,
      }),
    )
  }

  async function deleteCv(cvId: string): Promise<void> {
    const res = await api(`/api/cv/${cvId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(parseApiErrorMessage(res, 'Nepodarilo sa zmazať životopis.'))
  }

  async function cvFetch<T>(path: string, init?: { method?: string; body?: object }): Promise<T> {
    const res = await api<T>(path, {
      method: (init?.method as 'GET' | 'POST' | 'PATCH' | 'DELETE') ?? 'GET',
      body: init?.body,
    })
    return unwrap(res)
  }

  async function exportPdfBlob(cvId: string): Promise<{ blob: Blob; filename: string }> {
    const { session } = useAuth()
    const res = await fetchApiBinary(`${baseUrl.value}/api/cv/${cvId}/pdf`, session.value, {
      method: 'GET',
      accept: 'application/pdf',
    })
    if (!res.ok) {
      throw new Error('Nepodarilo sa exportovať PDF.')
    }
    const dispo = res.headers.get('content-disposition') || ''
    const match = /filename="([^"]+)"/.exec(dispo)
    const filename = match?.[1] ?? 'zivotopis.pdf'
    const blob = await res.blob()
    return { blob, filename }
  }

  async function uploadPhotoFile(cvId: string, file: File): Promise<CvHeaderResponseDto> {
    const { uploadCvPhoto } = useStorageUpload()
    return await uploadCvPhoto(cvId, file)
  }

  async function deletePhoto(cvId: string): Promise<CvHeaderResponseDto> {
    return unwrap(
      await api<CvHeaderResponseDto>(`/api/cv/${cvId}/photo`, { method: 'DELETE' }),
    )
  }

  async function postSection<T>(
    cvId: string,
    resource: string,
    body: unknown,
  ): Promise<T> {
    return unwrap(
      await api<T>(`/api/cv/${cvId}/${resource}`, { method: 'POST', body: body as object }),
    )
  }

  async function patchSection<T>(
    cvId: string,
    resource: string,
    rowId: string,
    body: unknown,
  ): Promise<T> {
    return unwrap(
      await api<T>(`/api/cv/${cvId}/${resource}/${rowId}`, {
        method: 'PATCH',
        body: body as object,
      }),
    )
  }

  async function deleteSectionRow(
    cvId: string,
    resource: string,
    rowId: string,
  ): Promise<void> {
    const res = await api(`/api/cv/${cvId}/${resource}/${rowId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(parseApiErrorMessage(res, 'Nepodarilo sa odstrániť položku.'))
  }

  async function reorderSection(cvId: string, resource: string, ids: string[]): Promise<void> {
    const res = await api(`/api/cv/${cvId}/${resource}/order`, {
      method: 'PATCH',
      body: { ids },
    })
    if (!res.ok) throw new Error(parseApiErrorMessage(res, 'Nepodarilo sa zoradiť položky.'))
  }

  return {
    baseUrl,
    listCvs,
    createCv,
    getCvAggregate,
    patchCv,
    patchProgress,
    deleteCv,
    exportPdfBlob,
    uploadPhotoFile,
    deletePhoto,
    postSection,
    patchSection,
    deleteSectionRow,
    reorderSection,
    cvFetch,
  }
}
