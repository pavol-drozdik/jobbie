import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { assertAllowedFileMime, assertMaxBytes } from './file-sniff.util';
import {
  assertDeclaredMime,
  parseImageFilename,
} from './filename.util';
import type { AdminStorageInitDto } from './admin-storage.dto';
import {
  BLOG_IMAGE_MAX_BYTES,
  BLOG_IMAGE_MIMES,
  bucketForBlogPurpose,
  type BlogStoragePurpose,
} from './upload-policy';

export type AdminStorageInitResult = {
  uploadId: string;
  bucket: string;
  path: string;
  token: string;
};

export type AdminStorageFinalizeResult = {
  publicUrl: string;
  storagePath: string;
  mime: string;
  size: number;
};

type PendingRow = {
  id: string;
  bucket_id: string;
  object_path: string;
  declared_mime: string;
  status: string;
};

@Injectable()
export class AdminStorageService {
  constructor(private readonly supabase: SupabaseService) {}

  async initBlogUpload(
    adminId: string,
    dto: AdminStorageInitDto,
  ): Promise<AdminStorageInitResult> {
    const purpose: BlogStoragePurpose = dto.purpose ?? 'blog_cover';
    const bucket = bucketForBlogPurpose(purpose);
    assertMaxBytes(dto.sizeBytes, BLOG_IMAGE_MAX_BYTES);
    const parsed = parseImageFilename(dto.originalFilename);
    const declaredMime = assertDeclaredMime(dto.mimeType, BLOG_IMAGE_MIMES);
    const objectPath = `admin/${adminId}/${randomUUID()}.${parsed.extension === 'jpeg' ? 'jpg' : parsed.extension}`;

    const client = this.supabase.getClient();
    const { data: row, error: insertErr } = await client
      .from('storage_pending_uploads')
      .insert({
        user_id: adminId,
        bucket_id: bucket,
        object_path: objectPath,
        purpose,
        entity_id: null,
        original_filename: parsed.originalFilename,
        sanitized_filename: parsed.originalFilename,
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
      .createSignedUploadUrl(objectPath);

    if (signErr || !signed?.token) {
      await this.failUpload(row.id as string, bucket, objectPath);
      throw new BadRequestException(signErr?.message || 'Could not create signed upload URL.');
    }

    return {
      uploadId: row.id as string,
      bucket,
      path: signed.path ?? objectPath,
      token: signed.token,
    };
  }

  async finalizeBlogUpload(
    adminId: string,
    uploadId: string,
    reportedSizeBytes?: number,
  ): Promise<AdminStorageFinalizeResult> {
    const pending = await this.loadPending(uploadId, adminId);
    if (pending.status !== 'pending') {
      throw new ConflictException('Upload already finalized.');
    }

    const bucket = pending.bucket_id;
    const client = this.supabase.getClient();
    const { data: blob, error: dlErr } = await client.storage
      .from(bucket)
      .download(pending.object_path);

    if (dlErr || !blob) {
      await this.failUpload(pending.id, bucket, pending.object_path);
      throw new BadRequestException('Uploaded file not found. Please try again.');
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    assertMaxBytes(buffer.length, BLOG_IMAGE_MAX_BYTES);
    if (reportedSizeBytes != null) {
      assertMaxBytes(reportedSizeBytes, BLOG_IMAGE_MAX_BYTES);
    }

    const mime = await assertAllowedFileMime(buffer, BLOG_IMAGE_MIMES, {
      declaredMime: pending.declared_mime,
    });

    const { data: pub } = client.storage.from(bucket).getPublicUrl(pending.object_path);
    if (!pub?.publicUrl) {
      throw new BadRequestException('Could not resolve public URL.');
    }

    await client
      .from('storage_pending_uploads')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', pending.id);

    return {
      publicUrl: pub.publicUrl,
      storagePath: pending.object_path,
      mime,
      size: buffer.length,
    };
  }

  /** @deprecated Use initBlogUpload */
  initBlogCover(adminId: string, dto: AdminStorageInitDto) {
    return this.initBlogUpload(adminId, { ...dto, purpose: 'blog_cover' });
  }

  /** @deprecated Use finalizeBlogUpload */
  finalizeBlogCover(adminId: string, uploadId: string, reportedSizeBytes?: number) {
    return this.finalizeBlogUpload(adminId, uploadId, reportedSizeBytes);
  }

  private async loadPending(uploadId: string, adminId: string): Promise<PendingRow & { declared_mime: string }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('storage_pending_uploads')
      .select('id,bucket_id,object_path,declared_mime,status,user_id')
      .eq('id', uploadId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new BadRequestException('Upload not found.');
    if ((data as { user_id: string }).user_id !== adminId) {
      throw new BadRequestException('Upload not found.');
    }
    return data as PendingRow & { declared_mime: string };
  }

  private async failUpload(uploadId: string, bucket: string, objectPath: string): Promise<void> {
    const client = this.supabase.getClient();
    await client.storage.from(bucket).remove([objectPath]).catch(() => undefined);
    await client
      .from('storage_pending_uploads')
      .update({ status: 'failed' })
      .eq('id', uploadId);
  }
}
