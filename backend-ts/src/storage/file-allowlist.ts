import { BadRequestException } from '@nestjs/common';

/** Image extensions (no svg). */
export const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Document extensions for chat attachments. */
export const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'rtf',
  'odt',
  'ods',
]);

export const DOCUMENT_MIMES = [
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
] as const;

export const BLOCKED_EXTENSIONS = new Set([
  'js',
  'jsx',
  'ts',
  'tsx',
  'html',
  'htm',
  'css',
  'php',
  'py',
  'rb',
  'java',
  'c',
  'cpp',
  'h',
  'sh',
  'bash',
  'zsh',
  'sql',
  'json',
  'yaml',
  'yml',
  'xml',
  'exe',
  'dmg',
  'app',
  'bat',
  'cmd',
  'msi',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'svg',
]);

export const CV_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
export const CV_PHOTO_MIMES_LIST = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type StorageUploadPurpose =
  | 'job_photo'
  | 'profile_avatar'
  | 'cv_photo'
  | 'chat_media';

export function allowedExtensionsForPurpose(purpose: StorageUploadPurpose): Set<string> {
  switch (purpose) {
    case 'job_photo':
    case 'profile_avatar':
      return IMAGE_EXTENSIONS;
    case 'cv_photo':
      return CV_PHOTO_EXTENSIONS;
    case 'chat_media':
      return new Set([...IMAGE_EXTENSIONS, ...DOCUMENT_EXTENSIONS]);
    default:
      return new Set();
  }
}

export function allowedMimesForPurpose(purpose: StorageUploadPurpose): readonly string[] {
  switch (purpose) {
    case 'job_photo':
    case 'profile_avatar':
      return IMAGE_MIMES;
    case 'cv_photo':
      return CV_PHOTO_MIMES_LIST;
    case 'chat_media':
      return [...IMAGE_MIMES, ...DOCUMENT_MIMES];
    default:
      return [];
  }
}

export function normalizeMime(mime: string | undefined): string {
  const raw = (mime ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (raw === 'image/jpg') return 'image/jpeg';
  return raw;
}

export function assertDeclaredMimeAllowed(
  mime: string | undefined,
  allowed: readonly string[],
): string {
  const normalized = normalizeMime(mime);
  if (!normalized) {
    throw new BadRequestException('MIME type is required.');
  }
  if (normalized === 'image/svg+xml') {
    throw new BadRequestException('SVG uploads are not allowed.');
  }
  if (!(allowed as readonly string[]).includes(normalized)) {
    throw new BadRequestException('File type is not allowed.');
  }
  return normalized;
}

export type ParsedFilename = {
  originalFilename: string;
  sanitizedFilename: string;
  extension: string;
};

/**
 * Validates filename safety and extension against allowlist / blocklist.
 * Rejects path traversal, missing extension, and double-extension tricks.
 */
export function parseAndValidateFilename(
  originalName: string,
  allowedExtensions: Set<string>,
): ParsedFilename {
  const raw = (originalName ?? '').trim();
  if (!raw) {
    throw new BadRequestException('Filename is required.');
  }
  if (raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
    throw new BadRequestException('Invalid filename.');
  }
  const base = raw.split(/[/\\]/).pop() ?? raw;
  const sanitized = base.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 200);
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new BadRequestException('Invalid filename.');
  }
  const dotParts = sanitized.toLowerCase().split('.');
  if (dotParts.length < 2) {
    throw new BadRequestException('File must have an extension.');
  }
  const ext = dotParts[dotParts.length - 1] ?? '';
  if (!ext) {
    throw new BadRequestException('File must have an extension.');
  }
  for (let i = 0; i < dotParts.length - 1; i++) {
    const segment = dotParts[i] ?? '';
    if (segment && BLOCKED_EXTENSIONS.has(segment)) {
      throw new BadRequestException('Suspicious filename or extension.');
    }
  }
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new BadRequestException('File type is not allowed.');
  }
  if (!allowedExtensions.has(ext)) {
    throw new BadRequestException('File type is not allowed.');
  }
  return {
    originalFilename: base.slice(0, 255),
    sanitizedFilename: sanitized,
    extension: ext,
  };
}

export function extensionForMime(mime: string): string | undefined {
  const map: Record<string, string> = {
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
  return map[normalizeMime(mime)];
}

export function assertExtensionMatchesMime(extension: string, mime: string): void {
  const expected = extensionForMime(mime);
  if (!expected) return;
  const ext = extension.toLowerCase();
  if (ext === 'jpeg' && expected === 'jpg') return;
  if (ext === expected) return;
  throw new BadRequestException('File extension does not match declared type.');
}
