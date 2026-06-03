import {
  IMAGE_UPLOAD_MIMES as POLICY_IMAGE_MIMES,
  JOB_PHOTO_STORAGE_MAX_BYTES,
} from '~/utils/upload-policy'

/** Max edge length in pixels before JPEG export (matches job/chat plan). */
export const JOB_PHOTO_MAX_EDGE_PX = 1920

/** Profile avatar: smaller export keeps uploads fast and thumbnails sharp enough. */
export const PROFILE_AVATAR_MAX_EDGE_PX = 512

export const JOB_PHOTO_JPEG_QUALITY = 0.85

export const DEFAULT_IMAGE_UPLOAD_MIME = POLICY_IMAGE_MIMES

export type ValidateImageUploadOptions = {
  maxBytes?: number
  allowedMime?: readonly string[]
}

/**
 * Client-side gate before compress/upload — UX only; Nest re-validates and re-encodes with sharp.
 */
export function validateImageUpload(
  file: File,
  options: ValidateImageUploadOptions = {},
): string | null {
  const maxBytes = options.maxBytes ?? JOB_PHOTO_STORAGE_MAX_BYTES
  const allowed = options.allowedMime ?? DEFAULT_IMAGE_UPLOAD_MIME
  if (!file.type || !allowed.includes(file.type)) {
    return 'Povolené sú iba obrázky (JPEG, PNG, WebP alebo GIF).'
  }
  if (file.size > maxBytes) {
    return `Súbor je príliš veľký (max. ${Math.round(maxBytes / 1024 / 1024)} MB).`
  }
  return null
}

export type CompressImageOptions = {
  maxEdgePx?: number
  jpegQuality?: number
  maxOutputBytes?: number
}

/**
 * Resize + JPEG export to cut upload time; authoritative size/MIME checks remain on the API.
 */
export async function compressImageFileToJpeg(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const maxEdgePx = options.maxEdgePx ?? JOB_PHOTO_MAX_EDGE_PX
  const jpegQuality = options.jpegQuality ?? JOB_PHOTO_JPEG_QUALITY
  const maxOutputBytes = options.maxOutputBytes ?? JOB_PHOTO_STORAGE_MAX_BYTES
  if (!import.meta.client || typeof document === 'undefined') {
    throw new Error('compressImageFileToJpeg is client-only')
  }
  const bitmap = await createImageBitmap(file)
  try {
    let { width, height } = bitmap
    const maxEdge = Math.max(width, height)
    if (maxEdge > maxEdgePx) {
      const scale = maxEdgePx / maxEdge
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', jpegQuality),
    )
    if (!blob) throw new Error('JPEG export failed')
    if (blob.size > maxOutputBytes) {
      throw new Error(
        `Obrázok je po úprave stále väčší ako ${Math.round(maxOutputBytes / 1024 / 1024)} MB.`,
      )
    }
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close()
  }
}

/**
 * CV profile photo: PNG inputs stay PNG (alpha preserved); other types export as JPEG.
 */
export async function prepareCvProfilePhotoForUpload(file: File): Promise<File> {
  const isPng = file.type === 'image/png' || /\.png$/i.test(file.name)
  if (!isPng) {
    return compressImageFileToJpeg(file, {
      maxEdgePx: PROFILE_AVATAR_MAX_EDGE_PX,
      maxOutputBytes: JOB_PHOTO_STORAGE_MAX_BYTES,
    })
  }
  if (!import.meta.client || typeof document === 'undefined') {
    throw new Error('prepareCvProfilePhotoForUpload is client-only')
  }
  const maxEdgePx = PROFILE_AVATAR_MAX_EDGE_PX
  const maxOutputBytes = JOB_PHOTO_STORAGE_MAX_BYTES
  const bitmap = await createImageBitmap(file)
  try {
    let { width, height } = bitmap
    const maxEdge = Math.max(width, height)
    if (maxEdge > maxEdgePx) {
      const scale = maxEdgePx / maxEdge
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    )
    if (!blob) throw new Error('PNG export failed')
    if (blob.size > maxOutputBytes) {
      throw new Error(
        `Obrázok je po úprave stále väčší ako ${Math.round(maxOutputBytes / 1024 / 1024)} MB.`,
      )
    }
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${baseName}.png`, {
      type: 'image/png',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close()
  }
}
