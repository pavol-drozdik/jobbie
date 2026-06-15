import { useApi } from '~/composables/useApi'
import type { CvHeaderResponseDto } from '~/types/cv'
import type {
  StorageChatMediaUploadResponse,
  StoragePublicUploadResponse,
  StorageUploadInitRequest,
  StorageUploadInitResponse,
} from '~/types/storage-upload'
import {
  validateStorageUploadMetadata,
  type JobPhotoKind,
  type StorageUploadPurpose,
} from '~/utils/upload-policy'

export type { StoragePublicUploadResponse }

function resolveFileMime(file: File): string {
  if (file.type && file.type.length > 0) return file.type
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : ''
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    txt: 'text/plain',
    rtf: 'application/rtf',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
  }
  if (ext && byExt[ext]) return byExt[ext]!
  return 'application/octet-stream'
}

export function useStorageUpload() {
  const { api } = useApi()
  const supabase = useSupabase()

  async function directUploadInit(
    body: StorageUploadInitRequest,
  ): Promise<StorageUploadInitResponse> {
    const res = await api<StorageUploadInitResponse>('/api/storage/uploads/init', {
      method: 'POST',
      body,
    })
    if (!res.ok || !res.data?.uploadId || !res.data.token) {
      const msg = res.error?.message ?? 'Nepodarilo sa pripraviť nahrávanie.'
      throw new Error(msg)
    }
    return res.data
  }

  async function directUploadToSignedUrl(
    bucket: string,
    path: string,
    token: string,
    file: File,
  ): Promise<void> {
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
      contentType: resolveFileMime(file),
      cacheControl: 'public, max-age=31536000, immutable',
    })
    if (error) {
      throw new Error(error.message || 'Priame nahrávanie zlyhalo.')
    }
  }

  async function pollUploadUntilReady(uploadId: string, maxAttempts = 40): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusRes = await api<{
        processing_status?: string
        ready?: boolean
        failed?: boolean
      }>(`/api/storage/uploads/${encodeURIComponent(uploadId)}/status`)
      if (statusRes.data?.failed) {
        throw new Error('Spracovanie súboru zlyhalo.')
      }
      if (statusRes.data?.ready || statusRes.data?.processing_status === 'ready') {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error('Spracovanie súboru trvá príliš dlho. Skúste to znova.')
  }

  async function directUploadFinalizePublic(
    uploadId: string,
    file: File,
  ): Promise<StoragePublicUploadResponse> {
    const res = await api<StoragePublicUploadResponse & { status?: string }>(
      `/api/storage/uploads/${encodeURIComponent(uploadId)}/finalize`,
      {
        method: 'POST',
        body: { reportedSizeBytes: file.size },
      },
    )
    if (res.data?.status === 'processing') {
      await pollUploadUntilReady(uploadId)
      const retry = await api<StoragePublicUploadResponse>(
        `/api/storage/uploads/${encodeURIComponent(uploadId)}/finalize`,
        {
          method: 'POST',
          body: { reportedSizeBytes: file.size },
        },
      )
      if (!retry.ok || !retry.data?.publicUrl) {
        throw new Error(retry.error?.message ?? 'Dokončenie nahrávania zlyhalo.')
      }
      return retry.data
    }
    if (!res.ok || !res.data?.publicUrl) {
      throw new Error(res.error?.message ?? 'Dokončenie nahrávania zlyhalo.')
    }
    return res.data
  }

  async function directUploadFinalizeChat(
    uploadId: string,
    file: File,
  ): Promise<StorageChatMediaUploadResponse> {
    const res = await api<StorageChatMediaUploadResponse & { status?: string }>(
      `/api/storage/uploads/${encodeURIComponent(uploadId)}/finalize`,
      {
        method: 'POST',
        body: { reportedSizeBytes: file.size },
      },
    )
    if (res.data?.status === 'processing') {
      await pollUploadUntilReady(uploadId)
      const retry = await api<StorageChatMediaUploadResponse>(
        `/api/storage/uploads/${encodeURIComponent(uploadId)}/finalize`,
        {
          method: 'POST',
          body: { reportedSizeBytes: file.size },
        },
      )
      if (!retry.ok || !retry.data?.storage_path) {
        throw new Error(retry.error?.message ?? 'Dokončenie nahrávania zlyhalo.')
      }
      return retry.data
    }
    if (!res.ok || !res.data?.storage_path) {
      throw new Error(res.error?.message ?? 'Dokončenie nahrávania zlyhalo.')
    }
    return res.data
  }

  async function runDirectUpload(
    purpose: StorageUploadPurpose,
    file: File,
    opts: { entityId?: string; kind?: JobPhotoKind } = {},
  ): Promise<StorageUploadInitResponse & { file: File }> {
    const validationError = validateStorageUploadMetadata(file, purpose)
    if (validationError) {
      throw new Error(validationError)
    }
    const init = await directUploadInit({
      purpose,
      originalFilename: file.name,
      mimeType: resolveFileMime(file),
      sizeBytes: file.size,
      entityId: opts.entityId,
      kind: opts.kind,
    })
    await directUploadToSignedUrl(init.bucket, init.path, init.token, file)
    return { ...init, file }
  }

  async function uploadJobPhoto(
    file: File,
    kind: JobPhotoKind,
  ): Promise<StoragePublicUploadResponse> {
    const init = await runDirectUpload('job_photo', file, { kind })
    return directUploadFinalizePublic(init.uploadId, file)
  }

  async function uploadProfileAvatar(file: File): Promise<StoragePublicUploadResponse> {
    const init = await runDirectUpload('profile_avatar', file)
    return directUploadFinalizePublic(init.uploadId, file)
  }

  async function uploadCvPhoto(cvId: string, file: File): Promise<CvHeaderResponseDto> {
    const validationError = validateStorageUploadMetadata(file, 'cv_photo')
    if (validationError) throw new Error(validationError)
    const init = await directUploadInit({
      purpose: 'cv_photo',
      originalFilename: file.name,
      mimeType: resolveFileMime(file),
      sizeBytes: file.size,
      entityId: cvId,
    })
    await directUploadToSignedUrl(init.bucket, init.path, init.token, file)
    const res = await api<CvHeaderResponseDto>(
      `/api/storage/uploads/${encodeURIComponent(init.uploadId)}/finalize`,
      {
        method: 'POST',
        body: { reportedSizeBytes: file.size },
      },
    )
    if (!res.ok || (!res.data?.photo_url && !res.data?.photo_storage_path)) {
      throw new Error(res.error?.message ?? 'Upload zlyhal')
    }
    return res.data
  }

  async function uploadChatMedia(
    roomId: string,
    file: File,
  ): Promise<StorageChatMediaUploadResponse> {
    const init = await runDirectUpload('chat_media', file, { entityId: roomId })
    return directUploadFinalizeChat(init.uploadId, file)
  }

  return {
    uploadJobPhoto,
    uploadProfileAvatar,
    uploadCvPhoto,
    uploadChatMedia,
    runDirectUpload,
    directUploadInit,
    directUploadToSignedUrl,
    directUploadFinalizePublic,
    directUploadFinalizeChat,
  }
}
