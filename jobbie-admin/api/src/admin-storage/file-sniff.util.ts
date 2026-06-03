import { BadRequestException } from '@nestjs/common';
import { fromBuffer } from 'file-type';

export function rejectSvg(mime: string | undefined, filename?: string): void {
  if (mime === 'image/svg+xml') {
    throw new BadRequestException('SVG uploads are not allowed.');
  }
  const lower = (filename ?? '').toLowerCase();
  if (lower.endsWith('.svg') || lower.includes('.svg?')) {
    throw new BadRequestException('SVG uploads are not allowed.');
  }
}

export async function detectMimeFromBuffer(buffer: Buffer): Promise<string | undefined> {
  if (!buffer.length) return undefined;
  const result = await fromBuffer(buffer);
  return result?.mime;
}

export async function assertAllowedFileMime(
  buffer: Buffer,
  allowed: readonly string[],
  options: { declaredMime?: string; filename?: string } = {},
): Promise<string> {
  rejectSvg(options.declaredMime, options.filename);
  const detected = await detectMimeFromBuffer(buffer);
  if (!detected) {
    throw new BadRequestException('Could not detect file type from content.');
  }
  rejectSvg(detected, options.filename);
  if (!allowed.includes(detected)) {
    throw new BadRequestException('File type is not allowed.');
  }
  const declared = options.declaredMime?.split(';')[0]?.trim().toLowerCase();
  if (declared && declared !== detected && !(declared === 'image/jpg' && detected === 'image/jpeg')) {
    throw new BadRequestException('Declared file type does not match file content.');
  }
  return detected;
}

export function assertMaxBytes(size: number, maxBytes: number): void {
  if (size > maxBytes) {
    throw new BadRequestException(
      `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`,
    );
  }
}
