import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { BACKGROUND_QUEUE_NAME } from '../queue/background-queue.module';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { assertAllowedFileMime, assertMaxBytes, rejectSvg } from './file-sniff.util';
import {
  allowedExtensionsForPurpose,
  allowedMimesForPurpose,
  assertDeclaredMimeAllowed,
  assertExtensionMatchesMime,
  parseAndValidateFilename,
  type StorageUploadPurpose,
} from './file-allowlist';
import { FileScanService } from './file-scan.service';
import { ImageProcessService } from './image-process.service';
import type { StorageUploadInitDto } from './storage-upload.dto';
import { PUBLIC_STORAGE_CACHE_CONTROL } from './storage-cache-policy';
import { jobPhotoThumbStoragePath } from '../jobs/job-photo-url.util';
import {
  BUCKET_CHAT_MEDIA,
  BUCKET_CV_PHOTOS,
  BUCKET_JOB_PHOTOS,
  BUCKET_PROFILE_AVATARS,
  CHAT_DOCUMENT_MIMES,
  CHAT_IMAGE_MIMES,
  CHAT_MEDIA_ALLOWED_MIMES,
  CHAT_MEDIA_MAX_BYTES,
  CV_PHOTO_MAX_BYTES,
  CV_PHOTO_MIMES,
  IMAGE_UPLOAD_MIMES,
  JOB_PHOTO_MAX_BYTES,
  MIME_TO_EXT,
  PROFILE_AVATAR_MAX_BYTES,
  maxBytesForPurpose,
  type JobPhotoKind,
} from './upload-policy';

export type PublicUploadResult = {
  storagePath: string;
  publicUrl: string;
  mime: string;
  size: number;
};

export type ChatMediaUploadResult = {
  storage_path: string;
  mime: string;
  size: number;
  original_name: string;
};

export type StorageUploadInitResult = {
  uploadId: string;
  bucket: string;
  path: string;
  token: string;
  signedUrl?: string;
};

type PendingUploadRow = {
  id: string;
  user_id: string;
  bucket_id: string;
  object_path: string;
  purpose: StorageUploadPurpose;
  entity_id: string | null;
  original_filename: string;
  sanitized_filename: string;
  declared_mime: string;
  extension: string;
  expected_size_bytes: number;
  status: string;
  processing_status?: string;
  processed_at?: string | null;
};

export type StorageAsyncFinalizeResponse = {
  status: 'processing';
  uploadId: string;
};

export type StorageFinalizeOutcome =
  | { purpose: 'job_photo' | 'profile_avatar'; result: PublicUploadResult }
  | { purpose: 'cv_photo'; entityId: string; result: PublicUploadResult }
  | { purpose: 'chat_media'; result: ChatMediaUploadResult };

/**
 * Direct-to-storage uploads: init (signed URL) → client upload → finalize (sniff + Sharp).
 */
@Injectable()
export class StorageUploadService {
  private readonly logger = new Logger(StorageUploadService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly images: ImageProcessService,
    private readonly fileScan: FileScanService,
    private readonly config: ConfigService,
    @Optional() @InjectQueue(BACKGROUND_QUEUE_NAME) private readonly backgroundQueue?: Queue,
  ) {}

  private isAsyncFinalizeEnabled(): boolean {
    return this.config.get<string>('STORAGE_ASYNC_FINALIZE') === 'true';
  }

  buildObjectKey(scopePrefix: string, ext: string): string {
    const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'bin';
    return `${scopePrefix}/${randomUUID()}.${safeExt}`;
  }

  async initUpload(userId: string, dto: StorageUploadInitDto): Promise<StorageUploadInitResult> {
    const purpose = dto.purpose;
    const maxBytes = maxBytesForPurpose(purpose);
    if (dto.sizeBytes > maxBytes) {
      throw new BadRequestException(
        `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`,
      );
    }

    const allowedExt = allowedExtensionsForPurpose(purpose);
    const parsed = parseAndValidateFilename(dto.originalFilename, allowedExt);
    const declaredMime = assertDeclaredMimeAllowed(dto.mimeType, allowedMimesForPurpose(purpose));
    assertExtensionMatchesMime(parsed.extension, declaredMime);

    rejectSvg(declaredMime, parsed.originalFilename);

    const { bucket, objectPath, entityId, upsert } = this.resolveUploadTarget(
      userId,
      purpose,
      dto,
      parsed.extension,
    );

    if (purpose === 'chat_media' && dto.entityId) {
      await this.assertChatRoomParticipant(dto.entityId, userId);
    }

    const client = this.supabase.getClient();
    const { data: row, error: insertErr } = await client
      .from('storage_pending_uploads')
      .insert({
        user_id: userId,
        bucket_id: bucket,
        object_path: objectPath,
        purpose,
        entity_id: entityId,
        original_filename: parsed.originalFilename,
        sanitized_filename: parsed.sanitizedFilename,
        declared_mime: declaredMime,
        extension: parsed.extension,
        expected_size_bytes: dto.sizeBytes,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr || !row?.id) {
      throw new BadRequestException(insertErr?.message || 'Could not create upload record.');
    }

    const { data: signed, error: signErr } = await client.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath, upsert ? { upsert: true } : undefined);

    if (signErr || !signed?.token) {
      await this.failUpload(row.id as string, objectPath, bucket);
      throw new BadRequestException(signErr?.message || 'Could not create signed upload URL.');
    }

    return {
      uploadId: row.id as string,
      bucket,
      path: signed.path ?? objectPath,
      token: signed.token,
      signedUrl: signed.signedUrl,
    };
  }

  async getFinalizeStatus(
    userId: string,
    uploadId: string,
  ): Promise<{
    processing_status: string;
    status: string;
    ready: boolean;
    failed: boolean;
  }> {
    const pending = await this.loadPendingForUser(uploadId, userId);
    const processingStatus = pending.processing_status ?? 'pending';
    return {
      processing_status: processingStatus,
      status: pending.status,
      ready: processingStatus === 'ready' || pending.status === 'completed',
      failed: processingStatus === 'failed' || pending.status === 'failed',
    };
  }

  async finalizeUpload(
    userId: string,
    uploadId: string,
    reportedSizeBytes?: number,
  ): Promise<StorageFinalizeOutcome | StorageAsyncFinalizeResponse> {
    const pending = await this.loadPendingForUser(uploadId, userId);
    if (pending.status === 'completed' || pending.processing_status === 'ready') {
      return this.buildOutcomeFromCompletedRow(pending);
    }
    if (pending.processing_status === 'processing') {
      return { status: 'processing', uploadId };
    }
    if (pending.processing_status === 'failed' || pending.status === 'failed') {
      throw new BadRequestException('Upload processing failed. Please start a new upload.');
    }
    if (this.isAsyncFinalizeEnabled() && this.backgroundQueue) {
      const client = this.supabase.getClient();
      await client
        .from('storage_pending_uploads')
        .update({ processing_status: 'processing' })
        .eq('id', pending.id);
      await this.backgroundQueue.add(
        'storage-finalize',
        { uploadId, userId, reportedSizeBytes },
        {
          jobId: `storage-finalize:${uploadId}`,
          removeOnComplete: 50,
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        },
      );
      return { status: 'processing', uploadId };
    }
    return this.executeFinalizeSync(userId, uploadId, reportedSizeBytes);
  }

  async processFinalizeJob(
    uploadId: string,
    userId: string,
    reportedSizeBytes?: number,
  ): Promise<void> {
    try {
      await this.executeFinalizeSync(userId, uploadId, reportedSizeBytes);
    } catch (err) {
      this.logger.warn(`storage-finalize ${uploadId} failed: ${String(err)}`);
      const client = this.supabase.getClient();
      await client
        .from('storage_pending_uploads')
        .update({
          processing_status: 'failed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', uploadId);
    }
  }

  private async executeFinalizeSync(
    userId: string,
    uploadId: string,
    reportedSizeBytes?: number,
  ): Promise<StorageFinalizeOutcome> {
    const pending = await this.loadPendingForUser(uploadId, userId);
    const client = this.supabase.getClient();
    const { data: blob, error: dlErr } = await client.storage
      .from(pending.bucket_id)
      .download(pending.object_path);
    if (dlErr || !blob) {
      await this.failUpload(pending.id, pending.object_path, pending.bucket_id);
      throw new BadRequestException('Uploaded file not found. Please try again.');
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    const maxBytes = maxBytesForPurpose(pending.purpose);
    assertMaxBytes(buffer.length, maxBytes);
    if (reportedSizeBytes != null && reportedSizeBytes > maxBytes) {
      throw new BadRequestException('File is too large.');
    }
    try {
      const outcome = await this.processPendingBuffer(pending, buffer);
      const now = new Date().toISOString();
      await client
        .from('storage_pending_uploads')
        .update({
          status: 'completed',
          completed_at: now,
          processing_status: 'ready',
          processed_at: now,
        })
        .eq('id', pending.id);
      return outcome;
    } catch (err) {
      await client
        .from('storage_pending_uploads')
        .update({
          processing_status: 'failed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', pending.id);
      await this.failUpload(pending.id, pending.object_path, pending.bucket_id);
      throw err;
    }
  }

  private async processPendingBuffer(
    pending: PendingUploadRow,
    buffer: Buffer,
  ): Promise<StorageFinalizeOutcome> {
    const options = {
      declaredMime: pending.declared_mime,
      filename: pending.original_filename,
    };

    switch (pending.purpose) {
      case 'job_photo': {
        const kind = this.jobKindFromPath(pending.object_path, pending.user_id);
        const result = await this.finalizeJobPhotoBuffer(
          pending.user_id,
          kind,
          buffer,
          options,
          pending.object_path,
        );
        return { purpose: 'job_photo', result };
      }
      case 'profile_avatar': {
        const result = await this.finalizeProfileAvatarBuffer(
          pending.user_id,
          buffer,
          options,
          pending.object_path,
        );
        return { purpose: 'profile_avatar', result };
      }
      case 'cv_photo': {
        if (!pending.entity_id) {
          throw new BadRequestException('Missing CV id.');
        }
        const result = await this.finalizeCvPhotoBuffer(
          pending.user_id,
          pending.entity_id,
          buffer,
          options,
          pending.object_path,
        );
        return {
          purpose: 'cv_photo',
          entityId: pending.entity_id,
          result,
        };
      }
      case 'chat_media': {
        if (!pending.entity_id) {
          throw new BadRequestException('Missing room id.');
        }
        const result = await this.finalizeChatMediaBuffer(
          pending.entity_id,
          pending.user_id,
          buffer,
          pending.original_filename,
          pending.declared_mime,
          pending.object_path,
        );
        return { purpose: 'chat_media', result };
      }
      default:
        throw new BadRequestException('Unknown upload purpose.');
    }
  }

  private async finalizeJobPhotoBuffer(
    userId: string,
    kind: JobPhotoKind,
    buffer: Buffer,
    options: { declaredMime?: string; filename?: string },
    storagePath: string,
  ): Promise<PublicUploadResult> {
    await assertAllowedFileMime(buffer, IMAGE_UPLOAD_MIMES, options);
    await this.fileScan.scan(buffer);
    const processed = await this.images.processJobPhoto(buffer);
    assertMaxBytes(processed.buffer.length, JOB_PHOTO_MAX_BYTES);
    const result = await this.overwriteObject(
      BUCKET_JOB_PHOTOS,
      storagePath,
      processed.buffer,
      processed.contentType,
      true,
    );
    try {
      const thumb = await this.images.processJobPhotoThumb(buffer);
      await this.overwriteObject(
        BUCKET_JOB_PHOTOS,
        jobPhotoThumbStoragePath(storagePath),
        thumb.buffer,
        thumb.contentType,
        true,
      );
    } catch (err) {
      this.logger.warn(`job photo thumb skipped: ${String(err)}`);
    }
    return result;
  }

  private async finalizeProfileAvatarBuffer(
    userId: string,
    buffer: Buffer,
    options: { declaredMime?: string; filename?: string },
    storagePath: string,
  ): Promise<PublicUploadResult> {
    await assertAllowedFileMime(buffer, IMAGE_UPLOAD_MIMES, options);
    await this.fileScan.scan(buffer);
    const processed = await this.images.processProfileAvatar(buffer);
    assertMaxBytes(processed.buffer.length, PROFILE_AVATAR_MAX_BYTES);
    return this.overwriteObject(
      BUCKET_PROFILE_AVATARS,
      storagePath,
      processed.buffer,
      processed.contentType,
      true,
    );
  }

  private async finalizeCvPhotoBuffer(
    userId: string,
    cvId: string,
    buffer: Buffer,
    options: { declaredMime?: string; filename?: string },
    storagePath: string,
  ): Promise<PublicUploadResult> {
    const detected = await assertAllowedFileMime(buffer, CV_PHOTO_MIMES, options);
    await this.fileScan.scan(buffer);
    const processed = await this.images.processCvPhoto(buffer, detected);
    assertMaxBytes(processed.buffer.length, CV_PHOTO_MAX_BYTES);
    // Private bucket — `publicUrl` returned by overwriteObject() is empty
    // when isPublic=false. Clients fetch the actual viewable URL via
    // `GET /api/cv/:cvId/photo-url` after a visibility / unlock check.
    return this.overwriteObject(
      BUCKET_CV_PHOTOS,
      storagePath,
      processed.buffer,
      processed.contentType,
      false,
    );
  }

  private async finalizeChatMediaBuffer(
    roomId: string,
    userId: string,
    buffer: Buffer,
    originalName: string,
    declaredMime: string,
    storagePath: string,
  ): Promise<ChatMediaUploadResult> {
    assertMaxBytes(buffer.length, CHAT_MEDIA_MAX_BYTES);
    rejectSvg(declaredMime, originalName);
    const detected = await assertAllowedFileMime(buffer, CHAT_MEDIA_ALLOWED_MIMES, {
      declaredMime,
      filename: originalName,
    });
    await this.fileScan.scan(buffer);

    const isImage = (CHAT_IMAGE_MIMES as readonly string[]).includes(detected);
    let uploadBuffer = buffer;
    let contentType = detected;
    let ext = MIME_TO_EXT[detected] ?? 'bin';

    if (isImage) {
      const processed = await this.images.processChatImage(buffer);
      uploadBuffer = processed.buffer;
      contentType = processed.contentType;
      ext = processed.ext;
    } else if (!(CHAT_DOCUMENT_MIMES as readonly string[]).includes(detected)) {
      throw new BadRequestException('File type is not allowed.');
    }

    assertMaxBytes(uploadBuffer.length, CHAT_MEDIA_MAX_BYTES);
    const { error } = await this.supabase
      .getClient()
      .storage.from(BUCKET_CHAT_MEDIA)
      .upload(storagePath, uploadBuffer, { contentType, upsert: true });
    if (error) {
      throw new ForbiddenException('Failed to finalize media');
    }

    return {
      storage_path: storagePath,
      mime: contentType,
      size: uploadBuffer.length,
      original_name: this.safeOriginalName(originalName, ext),
    };
  }

  private resolveUploadTarget(
    userId: string,
    purpose: StorageUploadPurpose,
    dto: StorageUploadInitDto,
    extension: string,
  ): { bucket: string; objectPath: string; entityId: string | null; upsert: boolean } {
    switch (purpose) {
      case 'job_photo': {
        const kind = dto.kind === 'extra' ? 'extra' : 'cover';
        return {
          bucket: BUCKET_JOB_PHOTOS,
          objectPath: this.buildObjectKey(`${userId}/${kind}`, extension),
          entityId: null,
          upsert: false,
        };
      }
      case 'profile_avatar':
        return {
          bucket: BUCKET_PROFILE_AVATARS,
          objectPath: `${userId}/avatar.jpg`,
          entityId: null,
          upsert: true,
        };
      case 'cv_photo': {
        if (!dto.entityId) {
          throw new BadRequestException('entityId (cvId) is required.');
        }
        // SECURITY: CV photos go to the private `cv-photos` bucket. Clients
        // receive a signed URL via `GET /api/cv/:cvId/photo-url` after the
        // backend confirms CV visibility / employer unlock. The old public
        // path (in `profile-avatars`) is preserved only for legacy rows;
        // backfill is documented in docs/uploads.md.
        return {
          bucket: BUCKET_CV_PHOTOS,
          objectPath: this.buildObjectKey(`${userId}/${dto.entityId}`, extension),
          entityId: dto.entityId,
          upsert: false,
        };
      }
      case 'chat_media': {
        if (!dto.entityId) {
          throw new BadRequestException('entityId (roomId) is required.');
        }
        return {
          bucket: BUCKET_CHAT_MEDIA,
          objectPath: this.buildObjectKey(`${dto.entityId}/${userId}`, extension),
          entityId: dto.entityId,
          upsert: false,
        };
      }
      default:
        throw new BadRequestException('Unknown upload purpose.');
    }
  }

  private jobKindFromPath(objectPath: string, userId: string): JobPhotoKind {
    const prefix = `${userId}/`;
    if (!objectPath.startsWith(prefix)) {
      throw new BadRequestException('Invalid storage path.');
    }
    const rest = objectPath.slice(prefix.length);
    if (rest.startsWith('extra/')) return 'extra';
    return 'cover';
  }

  private buildOutcomeFromCompletedRow(pending: PendingUploadRow): StorageFinalizeOutcome {
    // CV photos and chat media live in private buckets — no `getPublicUrl`.
    const isPrivateBucket =
      pending.bucket_id === BUCKET_CV_PHOTOS ||
      pending.bucket_id === BUCKET_CHAT_MEDIA;
    let publicUrl = '';
    if (!isPrivateBucket) {
      const { data: pub } = this.supabase
        .getClient()
        .storage.from(pending.bucket_id)
        .getPublicUrl(pending.object_path);
      publicUrl = pub?.publicUrl ?? '';
    }
    const base: PublicUploadResult = {
      storagePath: pending.object_path,
      publicUrl,
      mime: pending.declared_mime,
      size: pending.expected_size_bytes,
    };
    if (pending.purpose === 'chat_media') {
      return {
        purpose: 'chat_media',
        result: {
          storage_path: pending.object_path,
          mime: pending.declared_mime,
          size: pending.expected_size_bytes,
          original_name: pending.original_filename,
        },
      };
    }
    if (pending.purpose === 'cv_photo') {
      if (!pending.entity_id) {
        throw new BadRequestException('Missing CV id.');
      }
      return { purpose: 'cv_photo', entityId: pending.entity_id, result: base };
    }
    return { purpose: pending.purpose as 'job_photo' | 'profile_avatar', result: base };
  }

  private async loadPendingForUser(uploadId: string, userId: string): Promise<PendingUploadRow> {
    const { data, error } = await this.supabase
      .getClient()
      .from('storage_pending_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Upload record not found.');
    }
    return data as PendingUploadRow;
  }

  async failUpload(uploadId: string, objectPath: string, bucket: string): Promise<void> {
    const client = this.supabase.getClient();
    await client
      .from('storage_pending_uploads')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', uploadId);
    void client.storage.from(bucket).remove([objectPath]);
  }

  private async overwriteObject(
    bucket: string,
    storagePath: string,
    buffer: Buffer,
    contentType: string,
    isPublic: boolean,
  ): Promise<PublicUploadResult> {
    const { error } = await this.supabase
      .getClient()
      .storage.from(bucket)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
        cacheControl: isPublic ? PUBLIC_STORAGE_CACHE_CONTROL : undefined,
      });
    if (error) {
      throw new BadRequestException(error.message || 'Upload failed');
    }
    if (!isPublic) {
      return { storagePath, publicUrl: '', mime: contentType, size: buffer.length };
    }
    const { data: pub } = this.supabase.getClient().storage.from(bucket).getPublicUrl(storagePath);
    if (!pub?.publicUrl) {
      throw new BadRequestException('Missing public URL');
    }
    return {
      storagePath,
      publicUrl: pub.publicUrl,
      mime: contentType,
      size: buffer.length,
    };
  }

  private async assertChatRoomParticipant(roomId: string, userId: string): Promise<void> {
    const { data: room, error } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('company_id, individual_id')
      .eq('id', roomId)
      .single();
    if (
      error ||
      !room ||
      (room.company_id !== userId && room.individual_id !== userId)
    ) {
      throw new NotFoundException('Room not found');
    }
  }

  async createChatSignedUrl(storagePath: string, expiresSeconds = 600): Promise<string> {
    const { data, error } = await this.supabase
      .getClient()
      .storage.from(BUCKET_CHAT_MEDIA)
      .createSignedUrl(storagePath, expiresSeconds);
    if (error || !data?.signedUrl) {
      throw new BadRequestException('Media not found');
    }
    return data.signedUrl;
  }

  /** Short-lived signed URL for a CV photo in the private `cv-photos` bucket. */
  async createCvPhotoSignedUrl(
    storagePath: string,
    expiresSeconds = 600,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .getClient()
      .storage.from(BUCKET_CV_PHOTOS)
      .createSignedUrl(storagePath, expiresSeconds);
    if (error || !data?.signedUrl) {
      throw new NotFoundException('CV photo not found');
    }
    return data.signedUrl;
  }

  /**
   * Browser-viewable URL for a stored CV photo (signed private bucket or public legacy avatar path).
   */
  async resolveCvPhotoViewUrl(storagePath: string, expiresSeconds = 600): Promise<string> {
    const path = storagePath.trim();
    if (!path) {
      throw new NotFoundException('CV photo not found');
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    if (this.isPrivateCvPhotoPath(path)) {
      return this.createCvPhotoSignedUrl(path, expiresSeconds);
    }
    const { data } = this.supabase
      .getClient()
      .storage.from(BUCKET_PROFILE_AVATARS)
      .getPublicUrl(path);
    if (!data?.publicUrl?.trim()) {
      throw new NotFoundException('CV photo not found');
    }
    return data.publicUrl.trim();
  }

  /**
   * Returns true when the storage path lives in the new private CV photos
   * bucket. Used by CV mappers to decide whether to expose a raw public URL
   * (legacy `profile-avatars` path) or require a Nest signed-URL fetch.
   */
  isPrivateCvPhotoPath(storagePath: string | null | undefined): boolean {
    if (!storagePath) return false;
    // Path-only heuristic: new bucket photos are stored as
    // `{userId}/{cvId}/{uuid}.ext` (no `cv/` segment), while legacy
    // `profile-avatars` CV photos used `{userId}/cv/{cvId}/...`. Combined
    // with a column store of `bucket_id` (future schema upgrade) this can
    // become exact; for now the absence of the literal `/cv/` segment is the
    // signal that we're in the new private layout.
    return !storagePath.includes('/cv/');
  }

  /**
   * Validate a chat-media storage path belongs to a specific room and a
   * specific uploader. The Nest finalize pipeline always writes objects at
   * `{roomId}/{userId}/{uuid}.ext` (see `resolveUploadTarget` for `chat_media`).
   *
   * Without the per-user check, any room participant could request a signed
   * URL for any object under `{roomId}/` (including other participants' raw
   * uploads), giving an IDOR-style read of files they did not author.
   *
   * `expectedUploaderId` is the user id that should appear as the second path
   * segment. Callers that intentionally want to allow any room participant
   * (legacy signed-URL reads via Nest after authorising the room) should pass
   * `null`; new code SHOULD bind reads to the message's sender (see
   * `assertChatMediaPathForFinalizedUpload`).
   */
  assertChatMediaPathForRoom(
    roomId: string,
    storagePath: string,
    expectedUploaderId: string | null = null,
  ): void {
    const trimmed = storagePath.trim();
    if (!trimmed || trimmed.includes('..') || trimmed.includes('\0')) {
      throw new BadRequestException('Invalid media path');
    }
    const segs = trimmed.split('/');
    if (segs.length < 3) {
      throw new BadRequestException('Invalid media path');
    }
    if (segs[0] !== roomId) {
      throw new BadRequestException('Invalid media path');
    }
    if (expectedUploaderId !== null && segs[1] !== expectedUploaderId) {
      throw new BadRequestException('Invalid media path');
    }
  }

  /**
   * Confirms the storage path was produced by the Nest signed-upload pipeline
   * for the given uploader (a completed row in `storage_pending_uploads`).
   *
   * Used at chat message INSERT time so attackers cannot persist a message
   * referencing a foreign storage path or an arbitrary path they did not
   * actually upload through the sniff/Sharp pipeline.
   */
  async assertChatMediaPathForFinalizedUpload(
    roomId: string,
    storagePath: string,
    uploaderId: string,
  ): Promise<void> {
    this.assertChatMediaPathForRoom(roomId, storagePath, uploaderId);
    const { data } = await this.supabase
      .getClient()
      .from('storage_pending_uploads')
      .select('id, status')
      .eq('bucket_id', BUCKET_CHAT_MEDIA)
      .eq('object_path', storagePath)
      .eq('user_id', uploaderId)
      .eq('purpose', 'chat_media')
      .maybeSingle();
    if (!data || (data as { status?: string }).status !== 'completed') {
      throw new BadRequestException(
        'Chat media path does not match a finalized upload',
      );
    }
  }

  /**
   * Confirms the path is a finalized chat-media upload that belongs to the
   * given room (uploader can be any room participant). Used by the signed-URL
   * read endpoint to defeat path traversal / probing for non-finalized objects.
   */
  async assertChatMediaPathFinalized(
    roomId: string,
    storagePath: string,
  ): Promise<void> {
    this.assertChatMediaPathForRoom(roomId, storagePath, null);
    const { data } = await this.supabase
      .getClient()
      .from('storage_pending_uploads')
      .select('id, status')
      .eq('bucket_id', BUCKET_CHAT_MEDIA)
      .eq('object_path', storagePath)
      .eq('purpose', 'chat_media')
      .maybeSingle();
    if (!data || (data as { status?: string }).status !== 'completed') {
      throw new BadRequestException(
        'Chat media path does not match a finalized upload',
      );
    }
  }

  /**
   * Signed read URLs: finalized uploads first; legacy chat files that predate
   * `storage_pending_uploads` must still be referenced by a message in the room.
   */
  async assertChatMediaReadableInRoom(
    roomId: string,
    storagePath: string,
  ): Promise<void> {
    try {
      await this.assertChatMediaPathFinalized(roomId, storagePath);
      return;
    } catch (err) {
      if (!(err instanceof BadRequestException)) {
        throw err;
      }
    }
    await this.assertLegacyChatMediaReferencedInRoom(roomId, storagePath);
  }

  private async assertLegacyChatMediaReferencedInRoom(
    roomId: string,
    storagePath: string,
  ): Promise<void> {
    const { data: msg, error: msgErr } = await this.supabase
      .getClient()
      .from('chat_messages')
      .select('id')
      .eq('room_id', roomId)
      .ilike('content', `%${storagePath}%`)
      .limit(1)
      .maybeSingle();
    if (msgErr || !msg) {
      throw new BadRequestException(
        'Chat media path does not match a finalized upload',
      );
    }
    const { data, error } = await this.supabase
      .getClient()
      .storage.from(BUCKET_CHAT_MEDIA)
      .createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) {
      throw new BadRequestException('Media not found');
    }
  }

  safeOriginalName(originalName: string | undefined, ext: string): string {
    const base = (originalName ?? `subor.${ext}`).split(/[/\\]/).pop() ?? `subor.${ext}`;
    const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 200);
    return cleaned.length > 0 ? cleaned : `subor.${ext}`;
  }

  /**
   * Legacy CV JSON data_url path only — buffer still hits the API.
   * Prefer signed init/finalize for new clients.
   */
  async uploadCvPhotoLegacy(
    userId: string,
    cvId: string,
    buffer: Buffer,
    options: { declaredMime?: string; filename?: string } = {},
  ): Promise<PublicUploadResult> {
    const detected = await assertAllowedFileMime(buffer, CV_PHOTO_MIMES, options);
    await this.fileScan.scan(buffer);
    const processed = await this.images.processCvPhoto(buffer, detected);
    assertMaxBytes(processed.buffer.length, CV_PHOTO_MAX_BYTES);
    const storagePath = this.buildObjectKey(`${userId}/cv/${cvId}`, processed.ext);
    return this.overwriteObject(
      BUCKET_PROFILE_AVATARS,
      storagePath,
      processed.buffer,
      processed.contentType,
      true,
    );
  }
}
