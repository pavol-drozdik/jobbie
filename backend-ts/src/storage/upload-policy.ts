/** Public marketing / listing photos */
export const BUCKET_JOB_PHOTOS = 'job-photos' as const;
/** Profile avatars (public URLs). */
export const BUCKET_PROFILE_AVATARS = 'profile-avatars' as const;
/** Private CV photos — read via short-lived signed URL after visibility/unlock check. */
export const BUCKET_CV_PHOTOS = 'cv-photos' as const;
/** Pre-rendered CV PDF exports — read via Nest after auth (service role). */
export const BUCKET_CV_PDFS = 'cv-pdfs' as const;
export const CV_PDF_MAX_BYTES = 15 * 1024 * 1024;
/** Private chat attachments (signed URLs) */
export const BUCKET_CHAT_MEDIA = 'chat-media' as const;

export const JOB_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const CV_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_MEDIA_MAX_BYTES = 15 * 1024 * 1024;

/** Max base64 data_url length for legacy CV photo JSON (~5 MB decoded + overhead). */
export const CV_PHOTO_DATA_URL_MAX_CHARS = 7_000_000;

export const JOB_PHOTO_MAX_EDGE_PX = 1920;
/** List-card thumbnails written alongside full job photos at finalize. */
export const JOB_PHOTO_THUMB_MAX_EDGE_PX = 640;
export const PROFILE_AVATAR_MAX_EDGE_PX = 512;
export const CV_PHOTO_MAX_EDGE_PX = 512;

export const PENDING_UPLOAD_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export {
  IMAGE_MIMES as IMAGE_UPLOAD_MIMES,
  CV_PHOTO_MIMES_LIST as CV_PHOTO_MIMES,
  DOCUMENT_MIMES as CHAT_DOCUMENT_MIMES,
} from './file-allowlist';

import { IMAGE_MIMES, DOCUMENT_MIMES } from './file-allowlist';

export const CHAT_IMAGE_MIMES = [...IMAGE_MIMES] as const;

export const CHAT_MEDIA_ALLOWED_MIMES = [...IMAGE_MIMES, ...DOCUMENT_MIMES] as const;

export const BLOCKED_MIMES = ['image/svg+xml'] as const;

export const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
};

export type JobPhotoKind = 'cover' | 'extra';

export function maxBytesForPurpose(
  purpose: 'job_photo' | 'profile_avatar' | 'cv_photo' | 'chat_media',
): number {
  switch (purpose) {
    case 'job_photo':
      return JOB_PHOTO_MAX_BYTES;
    case 'profile_avatar':
      return PROFILE_AVATAR_MAX_BYTES;
    case 'cv_photo':
      return CV_PHOTO_MAX_BYTES;
    case 'chat_media':
      return CHAT_MEDIA_MAX_BYTES;
  }
}
