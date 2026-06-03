import type { ApiResponse } from '~/composables/useApi'
import type { CvHeaderResponseDto } from '~/types/cv'

export function isPublicHttpImageUrl(value: string | null | undefined): boolean {
  return /^https?:\/\//i.test((value ?? '').trim())
}

type CvPhotoApi = (
  path: string,
) => Promise<ApiResponse<{ url: string }>>

/** Viewable URL for `<img>` — public URL or short-lived signed URL from Nest. */
export async function resolveCvPhotoDisplayUrl(
  cvId: string,
  header: Pick<CvHeaderResponseDto, 'photo_url' | 'photo_storage_path' | 'photo_view_url'>,
  api: CvPhotoApi,
): Promise<string | null> {
  const viewUrl = (header.photo_view_url ?? '').trim()
  if (isPublicHttpImageUrl(viewUrl)) {
    return viewUrl
  }
  const direct = (header.photo_url ?? '').trim()
  if (isPublicHttpImageUrl(direct)) {
    return direct
  }
  const storagePath = (header.photo_storage_path ?? direct).trim()
  if (!storagePath || isPublicHttpImageUrl(storagePath)) {
    return storagePath || null
  }
  const res = await api<{ url: string }>(`/api/cv/${encodeURIComponent(cvId)}/photo-url`)
  const resolved = res.data?.url?.trim() ?? ''
  if (!res.ok || !isPublicHttpImageUrl(resolved)) {
    return null
  }
  return resolved
}
