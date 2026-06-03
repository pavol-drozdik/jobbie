import {
  Body,
  Controller,
  GoneException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  forwardRef,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { CvService } from '../cv/cv.service';
import { StorageUploadFinalizeDto, StorageUploadInitDto } from './storage-upload.dto';
import { StorageUploadService, type StorageFinalizeOutcome } from './storage-upload.service';

const UPLOAD_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('storage')
export class StorageController {
  constructor(
    private readonly storage: StorageUploadService,
    @Inject(forwardRef(() => CvService))
    private readonly cv: CvService,
  ) {}

  @Post('uploads/init')
  @Throttle(UPLOAD_THROTTLE)
  async initUpload(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: StorageUploadInitDto,
  ) {
    if (body.purpose === 'cv_photo' && body.entityId) {
      await this.cv.assertWorkerRole(user.id);
      await this.cv.assertCvOwned(user.id, body.entityId);
    }
    return this.storage.initUpload(user.id, body);
  }

  @Get('uploads/:uploadId/status')
  @Throttle(UPLOAD_THROTTLE)
  async getUploadStatus(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ) {
    return this.storage.getFinalizeStatus(user.id, uploadId);
  }

  @Post('uploads/:uploadId/finalize')
  @Throttle(UPLOAD_THROTTLE)
  async finalizeUpload(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Body() body: StorageUploadFinalizeDto,
  ) {
    const outcome = await this.storage.finalizeUpload(
      user.id,
      uploadId,
      body.reportedSizeBytes,
    );
    if ('status' in outcome && outcome.status === 'processing') {
      return outcome;
    }
    const finalized = outcome as StorageFinalizeOutcome;

    if (finalized.purpose === 'cv_photo') {
      return this.cv.applyPhotoFromDirectUpload(user.id, finalized.entityId, {
        publicUrl: finalized.result.publicUrl,
        storagePath: finalized.result.storagePath,
        mime: finalized.result.mime,
      });
    }

    if (finalized.purpose === 'chat_media') {
      return finalized.result;
    }

    return {
      publicUrl: finalized.result.publicUrl,
      storagePath: finalized.result.storagePath,
      mime: finalized.result.mime,
      size: finalized.result.size,
    };
  }

  /** @deprecated Use POST /storage/uploads/init + finalize */
  @Post('job-photo')
  @Throttle(UPLOAD_THROTTLE)
  uploadJobPhotoDeprecated(): never {
    throw new GoneException(
      'Multipart upload removed. Use POST /api/storage/uploads/init then finalize.',
    );
  }

  /** @deprecated Use POST /storage/uploads/init + finalize */
  @Post('profile-avatar')
  @Throttle(UPLOAD_THROTTLE)
  uploadProfileAvatarDeprecated(): never {
    throw new GoneException(
      'Multipart upload removed. Use POST /api/storage/uploads/init then finalize.',
    );
  }
}
