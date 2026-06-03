import { BadRequestException } from '@nestjs/common';
import { assertAllowedFileMime, rejectSvg } from './file-sniff.util';
import { IMAGE_UPLOAD_MIMES } from './upload-policy';

/** Minimal valid JPEG (1x1) for magic-byte detection. */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='.replace(
    /^data:.*?;base64,/,
    '',
  ),
  'base64',
);

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const PDF_BYTES = Buffer.from('%PDF-1.4\n%', 'utf8');

describe('file-sniff.util', () => {
  it('accepts JPEG magic bytes', async () => {
    const mime = await assertAllowedFileMime(TINY_JPEG, IMAGE_UPLOAD_MIMES);
    expect(mime).toBe('image/jpeg');
  });

  it('rejects PDF when only images allowed', async () => {
    await expect(assertAllowedFileMime(PDF_BYTES, IMAGE_UPLOAD_MIMES)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects SVG by mime and filename', () => {
    expect(() => rejectSvg('image/svg+xml', 'x.svg')).toThrow(BadRequestException);
    expect(() => rejectSvg(undefined, 'evil.svg')).toThrow(BadRequestException);
  });

  it('accepts PNG when allowed', async () => {
    const mime = await assertAllowedFileMime(TINY_PNG, IMAGE_UPLOAD_MIMES);
    expect(mime).toBe('image/png');
  });
});
