/** Mirrors backend-ts/src/storage/upload-policy.ts and file-allowlist — keep in sync. */
export const JOB_PHOTO_STORAGE_MAX_BYTES = 5 * 1024 * 1024
export const PROFILE_AVATAR_STORAGE_MAX_BYTES = 5 * 1024 * 1024
export const CV_PHOTO_STORAGE_MAX_BYTES = 5 * 1024 * 1024
export const CHAT_MEDIA_MAX_BYTES = 15 * 1024 * 1024

export const IMAGE_UPLOAD_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif' as const

export const CV_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp' as const

export const CHAT_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods' as const

export const IMAGE_UPLOAD_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const CV_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const CHAT_DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
] as const

export const CHAT_MEDIA_ALLOWED_MIMES = [...IMAGE_UPLOAD_MIMES, ...CHAT_DOCUMENT_MIMES] as const

export type JobPhotoKind = 'cover' | 'extra'

export type StorageUploadPurpose = 'job_photo' | 'profile_avatar' | 'cv_photo' | 'chat_media'

const BLOCKED_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'php', 'py', 'rb', 'java',
  'c', 'cpp', 'h', 'sh', 'bash', 'zsh', 'sql', 'json', 'yaml', 'yml', 'xml',
  'exe', 'dmg', 'app', 'bat', 'cmd', 'msi', 'zip', 'rar', '7z', 'tar', 'gz', 'svg',
])

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'odt', 'ods',
])
const CV_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

function allowedExtensionsForPurpose(purpose: StorageUploadPurpose): Set<string> {
  switch (purpose) {
    case 'job_photo':
    case 'profile_avatar':
      return IMAGE_EXTENSIONS
    case 'cv_photo':
      return CV_EXTENSIONS
    case 'chat_media':
      return new Set([...IMAGE_EXTENSIONS, ...DOCUMENT_EXTENSIONS])
  }
}

function allowedMimesForPurpose(purpose: StorageUploadPurpose): readonly string[] {
  switch (purpose) {
    case 'job_photo':
    case 'profile_avatar':
      return IMAGE_UPLOAD_MIMES
    case 'cv_photo':
      return CV_PHOTO_MIMES
    case 'chat_media':
      return CHAT_MEDIA_ALLOWED_MIMES
  }
}

function maxBytesForPurpose(purpose: StorageUploadPurpose): number {
  switch (purpose) {
    case 'job_photo':
      return JOB_PHOTO_STORAGE_MAX_BYTES
    case 'profile_avatar':
      return PROFILE_AVATAR_STORAGE_MAX_BYTES
    case 'cv_photo':
      return CV_PHOTO_STORAGE_MAX_BYTES
    case 'chat_media':
      return CHAT_MEDIA_MAX_BYTES
  }
}

function normalizeMime(mime: string): string {
  const raw = mime.split(';')[0]?.trim().toLowerCase() ?? ''
  if (raw === 'image/jpg') return 'image/jpeg'
  return raw
}

function validateFilename(originalName: string, allowedExt: Set<string>): string | null {
  const raw = (originalName ?? '').trim()
  if (!raw || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
    return 'Neplatný názov súboru.'
  }
  const base = raw.split(/[/\\]/).pop() ?? raw
  const parts = base.toLowerCase().split('.')
  if (parts.length < 2) return 'Súbor musí mať príponu.'
  const ext = parts[parts.length - 1] ?? ''
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i] ?? ''
    if (seg && BLOCKED_EXTENSIONS.has(seg)) {
      return 'Nepodporovaný typ súboru.'
    }
  }
  if (BLOCKED_EXTENSIONS.has(ext) || !allowedExt.has(ext)) {
    return 'Nepodporovaný typ súboru.'
  }
  return null
}

/** UX-only validation before requesting a signed upload URL. */
export function validateStorageUploadMetadata(
  file: File,
  purpose: StorageUploadPurpose,
): string | null {
  const maxBytes = maxBytesForPurpose(purpose)
  if (file.size > maxBytes) {
    return `Súbor je príliš veľký (max. ${Math.round(maxBytes / 1024 / 1024)} MB).`
  }
  const nameErr = validateFilename(file.name, allowedExtensionsForPurpose(purpose))
  if (nameErr) return nameErr
  const mime = normalizeMime(file.type ?? '')
  if (mime === 'image/svg+xml') return 'SVG súbory nie sú povolené.'
  const allowed = allowedMimesForPurpose(purpose)
  if (mime && !(allowed as readonly string[]).includes(mime)) {
    return 'Nepodporovaný typ súboru.'
  }
  if (!mime) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!allowedExtensionsForPurpose(purpose).has(ext)) {
      return 'Nepodporovaný typ súboru.'
    }
  }
  return null
}

export function validateChatDocumentUpload(file: File): string | null {
  if (file.type?.startsWith('image/')) {
    return validateStorageUploadMetadata(file, 'chat_media')
  }
  const err = validateStorageUploadMetadata(file, 'chat_media')
  if (err) return err
  const mime = normalizeMime(file.type ?? '')
  if (mime && (CHAT_DOCUMENT_MIMES as readonly string[]).includes(mime)) {
    return null
  }
  const name = file.name.toLowerCase()
  const docExt =
    name.endsWith('.pdf') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx') ||
    name.endsWith('.xls') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.csv') ||
    name.endsWith('.txt') ||
    name.endsWith('.rtf') ||
    name.endsWith('.odt') ||
    name.endsWith('.ods')
  if (docExt) return null
  return 'Povolené sú iba obrázky alebo dokumenty (PDF, Word, Excel, CSV, TXT, RTF, ODT, ODS).'
}
