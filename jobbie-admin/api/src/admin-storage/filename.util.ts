import { BadRequestException } from '@nestjs/common';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

const BLOCKED_EXTENSIONS = new Set([
  'js', 'html', 'htm', 'svg', 'exe', 'php', 'zip',
]);

export function parseImageFilename(originalName: string): {
  originalFilename: string;
  extension: string;
} {
  const raw = (originalName ?? '').trim();
  if (!raw || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
    throw new BadRequestException('Invalid filename.');
  }
  const base = raw.split(/[/\\]/).pop() ?? raw;
  const sanitized = base.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 200);
  const dotParts = sanitized.toLowerCase().split('.');
  if (dotParts.length < 2) {
    throw new BadRequestException('File must have an extension.');
  }
  const ext = dotParts[dotParts.length - 1] ?? '';
  if (!ext || BLOCKED_EXTENSIONS.has(ext) || !IMAGE_EXTENSIONS.has(ext)) {
    throw new BadRequestException('File type is not allowed.');
  }
  return { originalFilename: base.slice(0, 255), extension: ext };
}

export function normalizeMime(mime: string | undefined): string {
  const raw = (mime ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (raw === 'image/jpg') return 'image/jpeg';
  return raw;
}

export function assertDeclaredMime(mime: string | undefined, allowed: readonly string[]): string {
  const normalized = normalizeMime(mime);
  if (!normalized) throw new BadRequestException('MIME type is required.');
  if (!allowed.includes(normalized)) {
    throw new BadRequestException('File type is not allowed.');
  }
  return normalized;
}
