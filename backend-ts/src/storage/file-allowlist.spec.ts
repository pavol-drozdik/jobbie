import { BadRequestException } from '@nestjs/common';
import {
  IMAGE_EXTENSIONS,
  parseAndValidateFilename,
} from './file-allowlist';

describe('file-allowlist', () => {
  it('accepts valid image filename', () => {
    const parsed = parseAndValidateFilename('photo.JPG', IMAGE_EXTENSIONS);
    expect(parsed.extension).toBe('jpg');
  });

  it('rejects missing extension', () => {
    expect(() => parseAndValidateFilename('noext', IMAGE_EXTENSIONS)).toThrow(
      BadRequestException,
    );
  });

  it('rejects double-extension trick', () => {
    expect(() => parseAndValidateFilename('invoice.pdf.exe', IMAGE_EXTENSIONS)).toThrow(
      BadRequestException,
    );
  });

  it('rejects path traversal', () => {
    expect(() => parseAndValidateFilename('../secret.png', IMAGE_EXTENSIONS)).toThrow(
      BadRequestException,
    );
  });

  it('rejects blocked inner extension', () => {
    expect(() => parseAndValidateFilename('archive.zip.png', IMAGE_EXTENSIONS)).toThrow(
      BadRequestException,
    );
  });
});
