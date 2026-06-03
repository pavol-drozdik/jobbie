import { BadRequestException } from '@nestjs/common';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { BLOCKED_MIMES } from './upload-policy';

type FileTypeFromBuffer = (
  buffer: Buffer,
) => Promise<{ mime: string; ext: string } | undefined>;

let fileTypeFromBufferCached: FileTypeFromBuffer | undefined;

function loadFileTypeModule(): { fileTypeFromBuffer: FileTypeFromBuffer } {
  if (process.env.JEST_WORKER_ID !== undefined) {
    const mockPath = join(__dirname, '..', 'test', 'mocks', 'file-type.cjs');
    return createRequire(__filename)(mockPath) as { fileTypeFromBuffer: FileTypeFromBuffer };
  }
  const loadFileType = createRequire(join(__dirname, '..', '..', 'package.json'));
  return loadFileType('file-type') as { fileTypeFromBuffer: FileTypeFromBuffer };
}

function getFileTypeFromBuffer(): FileTypeFromBuffer {
  if (!fileTypeFromBufferCached) {
    fileTypeFromBufferCached = loadFileTypeModule().fileTypeFromBuffer;
  }
  return fileTypeFromBufferCached;
}

export function rejectSvg(mime: string | undefined, filename?: string): void {
  if (mime && (BLOCKED_MIMES as readonly string[]).includes(mime)) {
    throw new BadRequestException('SVG uploads are not allowed.');
  }
  const lower = (filename ?? '').toLowerCase();
  if (lower.endsWith('.svg') || lower.includes('.svg?')) {
    throw new BadRequestException('SVG uploads are not allowed.');
  }
}

export async function detectMimeFromBuffer(buffer: Buffer): Promise<string | undefined> {
  if (!buffer.length) return undefined;
  const result = await getFileTypeFromBuffer()(buffer);
  return result?.mime;
}

function mimeCompatible(declared: string, detected: string): boolean {
  if (declared === detected) return true;
  if (declared === 'image/jpg' && detected === 'image/jpeg') return true;
  if (declared === 'image/jpeg' && detected === 'image/jpg') return true;
  return false;
}

/**
 * Validates buffer magic bytes against an allowlist. Returns the detected MIME.
 * SECURITY: Never trust client Content-Type or file extension alone.
 */
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
  if (!(allowed as readonly string[]).includes(detected)) {
    throw new BadRequestException('File type is not allowed.');
  }
  const declared = options.declaredMime?.split(';')[0]?.trim().toLowerCase();
  if (declared && !mimeCompatible(declared, detected)) {
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
