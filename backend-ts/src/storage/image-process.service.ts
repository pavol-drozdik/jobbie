import { Injectable } from '@nestjs/common';
// sharp is CJS; default import compiles to .default which is undefined without esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp').default;
import {
  CV_PHOTO_MAX_EDGE_PX,
  JOB_PHOTO_MAX_EDGE_PX,
  JOB_PHOTO_THUMB_MAX_EDGE_PX,
  PROFILE_AVATAR_MAX_EDGE_PX,
} from './upload-policy';

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

@Injectable()
export class ImageProcessService {
  /**
   * Re-encode via sharp to strip EXIF/metadata and normalize output.
   */
  async processJobPhoto(input: Buffer): Promise<ProcessedImage> {
    const buffer = await sharp(input)
      .rotate()
      .resize(JOB_PHOTO_MAX_EDGE_PX, JOB_PHOTO_MAX_EDGE_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: 'image/jpeg', ext: 'jpg' };
  }

  /** Smaller variant for job list cards (stored as `{uuid}_thumb.jpg`). */
  async processJobPhotoThumb(input: Buffer): Promise<ProcessedImage> {
    const buffer = await sharp(input)
      .rotate()
      .resize(JOB_PHOTO_THUMB_MAX_EDGE_PX, JOB_PHOTO_THUMB_MAX_EDGE_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: 'image/jpeg', ext: 'jpg' };
  }

  async processProfileAvatar(input: Buffer): Promise<ProcessedImage> {
    const buffer = await sharp(input)
      .rotate()
      .resize(PROFILE_AVATAR_MAX_EDGE_PX, PROFILE_AVATAR_MAX_EDGE_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: 'image/jpeg', ext: 'jpg' };
  }

  /** Preserve PNG when source is PNG (alpha); otherwise JPEG. */
  async processCvPhoto(input: Buffer, detectedMime: string): Promise<ProcessedImage> {
    const pipeline = sharp(input).rotate().resize(CV_PHOTO_MAX_EDGE_PX, CV_PHOTO_MAX_EDGE_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (detectedMime === 'image/png') {
      const buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      return { buffer, contentType: 'image/png', ext: 'png' };
    }
    const buffer = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    return { buffer, contentType: 'image/jpeg', ext: 'jpg' };
  }

  async processChatImage(input: Buffer): Promise<ProcessedImage> {
    const buffer = await sharp(input)
      .rotate()
      .resize(JOB_PHOTO_MAX_EDGE_PX, JOB_PHOTO_MAX_EDGE_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: 'image/jpeg', ext: 'jpg' };
  }
}
