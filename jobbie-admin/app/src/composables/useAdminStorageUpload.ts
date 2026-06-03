import { createClient } from '@supabase/supabase-js'
import { adminApi } from './adminApi'

export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export type BlogUploadPurpose = 'blog_cover' | 'blog_content'

let supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabase) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    supabase = createClient(url, key)
  }
  return supabase
}

function resolveMime(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  return (ext && map[ext]) || 'application/octet-stream'
}

export function validateBlogImageFile(file: File): string | null {
  const mime = resolveMime(file)
  if (!ALLOWED_MIMES.has(mime)) {
    return 'Povolené sú JPG, PNG, WebP alebo GIF.'
  }
  if (file.size > BLOG_IMAGE_MAX_BYTES) {
    return 'Obrázok je príliš veľký (max 5 MB).'
  }
  return null
}

/** @deprecated Use validateBlogImageFile */
export const validateBlogCoverFile = validateBlogImageFile

export async function uploadBlogImage(
  file: File,
  purpose: BlogUploadPurpose = 'blog_cover',
): Promise<{ publicUrl: string } | { error: string }> {
  const validation = validateBlogImageFile(file)
  if (validation) return { error: validation }

  const initRes = await adminApi<{
    uploadId: string
    bucket: string
    path: string
    token: string
  }>('/admin/storage/uploads/init', {
    method: 'POST',
    body: {
      originalFilename: file.name,
      mimeType: resolveMime(file),
      sizeBytes: file.size,
      purpose,
    },
  })

  if (!initRes.ok || !initRes.data) {
    return { error: initRes.ok ? 'Init zlyhal.' : `Chyba ${initRes.status}: ${initRes.body}` }
  }

  const { uploadId, bucket, path, token } = initRes.data
  const { error: upErr } = await getSupabase().storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: resolveMime(file),
    cacheControl: '3600',
  })
  if (upErr) return { error: upErr.message || 'Nahrávanie zlyhalo.' }

  const finRes = await adminApi<{ publicUrl: string }>(
    `/admin/storage/uploads/${encodeURIComponent(uploadId)}/finalize`,
    {
      method: 'POST',
      body: { reportedSizeBytes: file.size },
    },
  )
  if (!finRes.ok || !finRes.data?.publicUrl) {
    return { error: finRes.ok ? 'Finalize zlyhal.' : `Chyba ${finRes.status}: ${finRes.body}` }
  }
  return { publicUrl: finRes.data.publicUrl }
}

export async function uploadBlogCover(file: File) {
  return uploadBlogImage(file, 'blog_cover')
}

export async function uploadBlogContentImage(file: File) {
  return uploadBlogImage(file, 'blog_content')
}
