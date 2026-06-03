import type { StorageUploadPurpose } from '~/utils/upload-policy'
import type { JobPhotoKind } from '~/utils/upload-policy'

export type StorageUploadInitRequest = {
  purpose: StorageUploadPurpose
  originalFilename: string
  mimeType: string
  sizeBytes: number
  entityId?: string
  kind?: JobPhotoKind
}

export type StorageUploadInitResponse = {
  uploadId: string
  bucket: string
  path: string
  token: string
  signedUrl?: string
}

export type StoragePublicUploadResponse = {
  publicUrl: string
  storagePath: string
  mime: string
  size: number
}

export type StorageChatMediaUploadResponse = {
  storage_path: string
  mime: string
  size: number
  original_name: string
}
